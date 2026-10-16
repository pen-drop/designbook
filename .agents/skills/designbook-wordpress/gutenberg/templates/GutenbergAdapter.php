<?php
namespace Designbook;

/** Registers Designbook components as dynamic Gutenberg blocks from the live registry. */
final class GutenbergRenderError extends \RuntimeException {}

final class GutenbergAdapter {
    private const CORE_CHILDREN = ['core/paragraph', 'core/heading', 'core/image', 'core/list', 'core/list-item'];

    private static ?ComponentRegistry $registry = null;
    private static string $ns = '';
    private static array $blockIds = [];
    private static array $pendingSlots = [];
    private static bool $previewing = false;

    public static function register(ComponentRegistry $registry): void {
        try {
            self::$registry = $registry;
            self::$ns = strtolower(str_replace('_', '-', get_stylesheet()));
            self::$blockIds = [];
            self::$pendingSlots = [];
            $planned = [];
            $payloads = [];
            foreach ($registry->all() as $def) {
                $name = self::blockName(self::$ns, $def->id);
                if (isset($planned[$name])) {
                    throw new \RuntimeException("Block name collision: {$planned[$name]} and {$def->id} both map to $name");
                }
                $planned[$name] = $def->id;
                self::$blockIds[$name] = $def->id;
                $payloads[] = self::blockPayload(self::$ns, $def);
            }
            self::registerScript(self::$ns, $payloads);
            foreach ($payloads as $payload) {
                self::registerType($payload);
            }
            self::registerSlot(self::$ns);
            add_action('rest_api_init', [self::class, 'registerPreviewRoute']);
            add_action('enqueue_block_assets', [self::class, 'enqueueAssets']);
            if (did_action('rest_api_init')) {
                self::registerPreviewRoute();
            }
        } catch (\Throwable $e) {
            error_log('Designbook Gutenberg register: ' . $e->getMessage());
        }
    }

    public static function enqueueAssets(): void {
        $css = get_stylesheet_directory() . '/css/app.css';
        if (is_file($css)) {
            wp_enqueue_style(get_stylesheet(), get_stylesheet_directory_uri() . '/css/app.css', [], (string) filemtime($css));
        }
    }

    public static function registerPreviewRoute(): void {
        register_rest_route('designbook/v1', '/gutenberg-preview', [
            'methods' => 'POST',
            'callback' => [self::class, 'preview'],
            'permission_callback' => [self::class, 'previewPermission'],
        ]);
    }

    public static function previewPermission(\WP_REST_Request $request) {
        $postId = (int) $request->get_param('post_id');
        if ($postId > 0) {
            return current_user_can('edit_post', $postId);
        }
        return current_user_can('edit_theme_options');
    }

    public static function preview(\WP_REST_Request $request) {
        $content = (string) $request->get_param('content');
        if (strlen($content) > 1048576) {
            return new \WP_Error('designbook_preview_size', 'Preview content exceeds 1 MiB', ['status' => 400]);
        }
        try {
            self::$previewing = true;
            self::$pendingSlots = [];
            $blocks = parse_blocks($content);
            foreach ($blocks as $parsed) {
                self::validateTree($parsed);
            }
            $html = '';
            foreach ($blocks as $parsed) {
                $html .= render_block($parsed);
            }
            return ['html' => $html];
        } catch (GutenbergRenderError $e) {
            return new \WP_Error('designbook_preview_invalid', $e->getMessage(), ['status' => 400]);
        } catch (\Throwable $e) {
            return new \WP_Error('designbook_preview_failed', 'Preview failed', ['status' => 400]);
        } finally {
            self::$previewing = false;
            self::$pendingSlots = [];
        }
    }

    public static function renderBlock(array $attributes, string $content, $block = null): string {
        try {
            $name = is_object($block) ? (string) $block->name : '';
            $id = self::$blockIds[$name] ?? '';
            $def = $id !== '' ? self::$registry?->get($id) : null;
            if (!$def) {
                throw new GutenbergRenderError("Unknown component: $name");
            }
            $slotCount = 0;
            if (is_object($block) && isset($block->inner_blocks)) {
                foreach ($block->inner_blocks as $inner) {
                    if (($inner->name ?? '') === self::slotBlockName()) {
                        $slotCount++;
                    }
                }
            }
            $collected = $slotCount > 0 ? array_splice(self::$pendingSlots, -$slotCount, $slotCount) : [];
            $slots = [];
            foreach ($collected as $row) {
                $slots[$row['name']] = $row['html'];
            }
            foreach (array_keys($def->slots) as $slotName) {
                $slots[$slotName] = $slots[$slotName] ?? '';
            }
            return self::$registry->render($id, self::sanitizeProps($def, $attributes), $slots);
        } catch (\Throwable $e) {
            if (self::$previewing) {
                throw $e instanceof GutenbergRenderError ? $e : new GutenbergRenderError('Preview failed');
            }
            error_log('Designbook Gutenberg render: ' . $e->getMessage());
            return '';
        }
    }

    public static function renderSlot(array $attributes, string $content): string {
        self::$pendingSlots[] = [
            'name' => (string) ($attributes['name'] ?? ''),
            'html' => $content,
        ];
        return '';
    }

    public static function makeBlock(string $name, array $attrs = [], array $innerBlocks = []): array {
        $innerContent = [];
        foreach ($innerBlocks as $child) {
            $innerContent[] = '';
            $innerContent[] = null;
        }
        if ($innerBlocks !== []) {
            $innerContent[] = '';
        }
        return [
            'blockName' => $name,
            'attrs' => $attrs,
            'innerBlocks' => array_values($innerBlocks),
            'innerContent' => $innerContent,
        ];
    }

    public static function seedBlocks(string $designbookId, array $blocks, string $postType = 'page'): int {
        foreach ($blocks as $parsed) {
            self::validateTree($parsed);
        }
        $content = serialize_blocks($blocks);
        $found = get_posts([
            'post_type' => $postType,
            'meta_key' => '_designbook_id',
            'meta_value' => $designbookId,
            'numberposts' => 1,
            'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
            'fields' => 'ids',
        ]);
        $existing = $found ? (int) $found[0] : 0;
        if ($existing) {
            $result = wp_update_post([
                'ID' => $existing,
                'post_content' => wp_slash($content),
            ], true);
        } else {
            $result = wp_insert_post([
                'post_type' => $postType,
                'post_status' => 'publish',
                'post_title' => $designbookId,
                'post_name' => sanitize_title($designbookId),
                'post_content' => wp_slash($content),
                'meta_input' => ['_designbook_id' => $designbookId],
            ], true);
        }
        if (is_wp_error($result)) {
            throw new GutenbergRenderError($result->get_error_message());
        }
        return (int) $result;
    }

    private static function slotBlockName(): string {
        return self::$ns . '/slot';
    }

    private static function allowedNames(): array {
        return array_merge(array_keys(self::$blockIds), [self::slotBlockName()], self::CORE_CHILDREN);
    }

    private static function validateTree(array $parsed, int $depth = 0): void {
        if ($depth > 50) {
            throw new GutenbergRenderError('tree exceeds 50 levels');
        }
        $name = $parsed['blockName'] ?? null;
        if ($name === null) {
            if (trim((string) ($parsed['innerHTML'] ?? '')) !== '') {
                throw new GutenbergRenderError('unsupported freeform content');
            }
            return;
        }
        if (!in_array($name, self::allowedNames(), true)) {
            throw new GutenbergRenderError("unknown component $name");
        }
        $id = self::$blockIds[$name] ?? null;
        if ($id !== null) {
            $def = self::$registry?->get($id);
            if (!$def) {
                throw new GutenbergRenderError("unknown component $name");
            }
            self::validateAttrs($def, is_array($parsed['attrs'] ?? null) ? $parsed['attrs'] : []);
            $seen = [];
            foreach ($parsed['innerBlocks'] ?? [] as $inner) {
                $innerName = $inner['blockName'] ?? '';
                if ($innerName !== self::slotBlockName()) {
                    throw new GutenbergRenderError("{$def->id} requires slot wrappers");
                }
                $slotName = (string) ($inner['attrs']['name'] ?? '');
                if (!array_key_exists($slotName, $def->slots)) {
                    throw new GutenbergRenderError("unknown slot $slotName on {$def->id}");
                }
                if (isset($seen[$slotName])) {
                    throw new GutenbergRenderError("duplicate slot $slotName on {$def->id}");
                }
                $seen[$slotName] = true;
                self::validateTree($inner, $depth + 1);
            }
            return;
        }
        foreach ($parsed['innerBlocks'] ?? [] as $inner) {
            self::validateTree($inner, $depth + 1);
        }
    }

    private static function validateAttrs(ComponentDefinition $def, array $attrs): void {
        $properties = $def->props['properties'] ?? [];
        foreach ($def->props['required'] ?? [] as $req) {
            if (is_string($req) && !array_key_exists($req, $attrs)) {
                throw new GutenbergRenderError("{$def->id}.{$req}: required");
            }
        }
        foreach ($attrs as $prop => $value) {
            if (!isset($properties[$prop]) || !is_array($properties[$prop])) {
                continue;
            }
            $schema = $properties[$prop];
            $type = $schema['type'] ?? 'string';
            if (is_array($type)) {
                $type = $type[0] ?? 'string';
            }
            $ok = match ($type) {
                'string' => is_string($value),
                'integer' => is_int($value) || (is_string($value) && preg_match('/^-?\d+$/', $value) === 1),
                'number' => is_int($value) || is_float($value) || (is_string($value) && is_numeric($value)),
                'boolean' => is_bool($value),
                'object' => is_array($value) && (!array_is_list($value) || $value === []),
                'array' => is_array($value),
                default => false,
            };
            if (!$ok) {
                throw new GutenbergRenderError("{$def->id}.{$prop}: invalid type");
            }
            self::assertSafeUris($def->id, (string) $prop, $value, $schema);
        }
    }

    private static function sanitizeProps(ComponentDefinition $def, array $attributes): array {
        $properties = $def->props['properties'] ?? [];
        $props = [];
        foreach ($attributes as $prop => $value) {
            $schema = is_array($properties[$prop] ?? null) ? $properties[$prop] : [];
            $props[$prop] = self::scrubUris((string) $prop, $value, $schema);
        }
        return $props;
    }

    private static function assertSafeUris(string $id, string $prop, mixed $value, array $schema): void {
        if (is_string($value) && $value !== '' && self::isUriProp($prop, $schema) && !self::safeUri($value)) {
            throw new GutenbergRenderError("$id.$prop: unsafe URI");
        }
        if (!is_array($value)) {
            return;
        }
        $items = is_array($schema['items'] ?? null) ? $schema['items'] : [];
        $properties = is_array($schema['properties'] ?? null) ? $schema['properties'] : [];
        foreach ($value as $k => $v) {
            $childProp = is_string($k) ? $k : $prop;
            $childSchema = is_string($k) ? ($properties[$k] ?? []) : $items;
            self::assertSafeUris($id, $childProp, $v, is_array($childSchema) ? $childSchema : []);
        }
    }

    private static function scrubUris(string $prop, mixed $value, array $schema): mixed {
        if (is_string($value) && self::isUriProp($prop, $schema)) {
            return self::safeUri($value) ? $value : '';
        }
        if (!is_array($value)) {
            return $value;
        }
        $items = is_array($schema['items'] ?? null) ? $schema['items'] : [];
        $properties = is_array($schema['properties'] ?? null) ? $schema['properties'] : [];
        $out = [];
        foreach ($value as $k => $v) {
            $childProp = is_string($k) ? $k : $prop;
            $childSchema = is_string($k) ? ($properties[$k] ?? []) : $items;
            $out[$k] = self::scrubUris($childProp, $v, is_array($childSchema) ? $childSchema : []);
        }
        return $out;
    }

    private static function isUriProp(string $prop, array $schema): bool {
        if (($schema['format'] ?? '') === 'uri') {
            return true;
        }
        return in_array($prop, ['url', 'href', 'src', 'image_src'], true);
    }

    private static function safeUri(string $value): bool {
        return esc_url($value, ['http', 'https', 'mailto']) !== '';
    }

    private static function blockName(string $ns, string $id): string {
        return $ns . '/' . strtolower(str_replace('_', '-', $id));
    }

    private static function blockPayload(string $ns, ComponentDefinition $def): array {
        $properties = $def->props['properties'] ?? [];
        $attributes = [];
        $manifestAttrs = [];
        foreach ($properties as $prop => $schema) {
            if (!is_array($schema)) {
                throw new \InvalidArgumentException("{$def->id}.{$prop}: unsupported schema type");
            }
            $type = $schema['type'] ?? 'string';
            if (is_array($type)) {
                $type = $type[0] ?? 'string';
            }
            $wpType = match ($type) {
                'boolean' => 'boolean',
                'integer' => 'integer',
                'number' => 'number',
                'object' => 'object',
                'array' => 'array',
                'string' => 'string',
                default => throw new \InvalidArgumentException("{$def->id}.{$prop}: unsupported schema type '$type'"),
            };
            $attr = ['type' => $wpType];
            if (array_key_exists('default', $schema)) {
                $attr['default'] = $schema['default'];
            }
            $attributes[$prop] = $attr;
            $manifestAttrs[] = $attr + [
                'name' => $prop,
                'title' => $schema['title'] ?? $prop,
                'enum' => $schema['enum'] ?? null,
                'format' => $schema['format'] ?? null,
                'required' => in_array($prop, $def->props['required'] ?? [], true),
            ];
        }
        $slots = [];
        foreach ($def->slots as $slotName => $slot) {
            $slots[] = [
                'name' => $slotName,
                'title' => is_array($slot) ? ($slot['title'] ?? $slotName) : $slotName,
            ];
        }
        $category = $def->group ? sanitize_title($def->group) : 'designbook';
        $supports = [
            'html' => false,
            'align' => false,
            'color' => false,
            'typography' => false,
            'spacing' => false,
            'customClassName' => false,
        ];
        if (!$def->ui) {
            $supports['inserter'] = false;
        }
        return [
            'name' => self::blockName($ns, $def->id),
            'title' => $def->name,
            'category' => $category,
            'categoryTitle' => $def->group ?: 'Designbook',
            'attributes' => $attributes,
            'manifestAttributes' => $manifestAttrs,
            'slots' => $slots,
            'supports' => $supports,
        ];
    }

    private static function registerScript(string $ns, array $payloads): void {
        $categories = ['designbook' => 'Designbook'];
        foreach ($payloads as $payload) {
            $categories[$payload['category']] = $payload['categoryTitle'];
        }
        add_filter('block_categories_all', static function ($cats) use ($categories) {
            $existing = array_column($cats, 'slug');
            foreach ($categories as $slug => $title) {
                if (!in_array($slug, $existing, true)) {
                    $cats[] = ['slug' => $slug, 'title' => $title];
                }
            }
            return $cats;
        });
        wp_register_script(
            'designbook-gutenberg-editor',
            plugins_url('editor.js', __FILE__),
            ['wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-data', 'wp-api-fetch'],
            (string) (filemtime(__DIR__ . '/editor.js') ?: 1),
            true
        );
        $blocks = [];
        foreach ($payloads as $payload) {
            $blocks[] = [
                'name' => $payload['name'],
                'title' => $payload['title'],
                'kind' => 'component',
                'attributes' => $payload['manifestAttributes'],
                'slots' => $payload['slots'],
            ];
        }
        $blocks[] = [
            'name' => "$ns/slot",
            'title' => 'Slot',
            'kind' => 'slot',
            'attributes' => [
                ['name' => 'name', 'title' => 'Name', 'type' => 'string'],
                ['name' => 'title', 'title' => 'Title', 'type' => 'string'],
            ],
            'slots' => [],
        ];
        wp_localize_script('designbook-gutenberg-editor', 'designbookGutenberg', [
            'slotBlock' => "$ns/slot",
            'blocks' => $blocks,
            'allowedChildren' => array_values(array_merge(array_keys(self::$blockIds), self::CORE_CHILDREN)),
        ]);
    }

    private static function registerType(array $payload): void {
        $reg = \WP_Block_Type_Registry::get_instance();
        if ($reg->is_registered($payload['name'])) {
            $reg->unregister($payload['name']);
        }
        register_block_type($payload['name'], [
            'api_version' => 3,
            'title' => $payload['title'],
            'category' => $payload['category'],
            'attributes' => $payload['attributes'],
            'supports' => $payload['supports'],
            'editor_script' => 'designbook-gutenberg-editor',
            'render_callback' => [self::class, 'renderBlock'],
        ]);
    }

    private static function registerSlot(string $ns): void {
        $name = "$ns/slot";
        $reg = \WP_Block_Type_Registry::get_instance();
        if ($reg->is_registered($name)) {
            $reg->unregister($name);
        }
        register_block_type($name, [
            'api_version' => 3,
            'title' => 'Slot',
            'category' => 'designbook',
            'attributes' => [
                'name' => ['type' => 'string'],
                'title' => ['type' => 'string'],
            ],
            'supports' => [
                'inserter' => false,
                'reusable' => false,
                'html' => false,
            ],
            'editor_script' => 'designbook-gutenberg-editor',
            'render_callback' => [self::class, 'renderSlot'],
        ]);
    }
}
