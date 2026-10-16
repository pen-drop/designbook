<?php
namespace Designbook;

/** Registers Designbook components as dynamic Gutenberg blocks from the live registry. */
final class GutenbergRenderError extends \RuntimeException {}

final class GutenbergAdapter {
    private static ?ComponentRegistry $registry = null;
    private static string $ns = '';
    private static array $blockIds = [];
    private static array $pendingSlots = [];
    private static bool $previewing = false;

    public static function register(ComponentRegistry $registry): void {
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
            self::writeBlockJson($payload);
            self::registerType($payload);
        }
        self::registerSlot(self::$ns);
        add_action('rest_api_init', [self::class, 'registerPreviewRoute']);
        add_action('enqueue_block_assets', [self::class, 'enqueueAssets']);
        if (did_action('rest_api_init')) {
            self::registerPreviewRoute();
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
        $params = self::previewParams($request);
        $postId = (int) ($params['post_id'] ?? 0);
        if ($postId > 0) {
            return current_user_can('edit_post', $postId);
        }
        return current_user_can('edit_theme_options');
    }

    public static function preview(\WP_REST_Request $request) {
        $params = self::previewParams($request);
        $content = (string) ($params['content'] ?? '');
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
            self::validateComponentSlots($def, $collected);
            $slots = [];
            foreach ($collected as $row) {
                $slots[$row['name']] = $row['html'];
            }
            foreach (array_keys($def->slots) as $slotName) {
                $slots[$slotName] = $slots[$slotName] ?? '';
            }
            return self::$registry->render($id, self::sanitizeProps($def, $attributes), $slots);
        } catch (GutenbergRenderError $e) {
            if (self::$previewing) {
                throw $e;
            }
            error_log('Designbook Gutenberg render: ' . $e->getMessage());
            return '';
        } catch (\Throwable $e) {
            if (self::$previewing) {
                throw new GutenbergRenderError('Preview failed');
            }
            error_log('Designbook Gutenberg render: ' . $e->getMessage());
            return '';
        }
    }

    public static function renderSlot(array $attributes, string $content): string {
        self::$pendingSlots[] = [
            'name' => (string) ($attributes['name'] ?? ''),
            'html' => wp_kses_post($content),
        ];
        return '';
    }

    private static function previewParams(\WP_REST_Request $request): array {
        $json = $request->get_json_params();
        if (is_array($json) && $json !== []) {
            return $json;
        }
        return $request->get_params();
    }

    private static function slotBlockName(): string {
        return self::$ns . '/slot';
    }

    private static function allowedNames(): array {
        $names = array_keys(self::$blockIds);
        $names[] = self::slotBlockName();
        foreach (['core/paragraph', 'core/heading', 'core/image', 'core/list', 'core/list-item'] as $core) {
            $names[] = $core;
        }
        return $names;
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

    private static function validateComponentSlots(ComponentDefinition $def, array $collected): void {
        $seen = [];
        foreach ($collected as $row) {
            $slotName = $row['name'];
            if (!array_key_exists($slotName, $def->slots)) {
                throw new GutenbergRenderError("unknown slot $slotName on {$def->id}");
            }
            if (isset($seen[$slotName])) {
                throw new GutenbergRenderError("duplicate slot $slotName on {$def->id}");
            }
            $seen[$slotName] = true;
        }
    }

    private static function validateAttrs(ComponentDefinition $def, array $attrs): void {
        $properties = $def->props['properties'] ?? [];
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
                'object' => is_array($value) && !array_is_list($value),
                'array' => is_array($value),
                default => false,
            };
            if (!$ok) {
                throw new GutenbergRenderError("{$def->id}.{$prop}: invalid type");
            }
            if (($schema['format'] ?? '') === 'uri' && is_string($value) && $value !== '' && !self::safeUri($value)) {
                throw new GutenbergRenderError("{$def->id}.{$prop}: unsafe URI");
            }
        }
    }

    private static function sanitizeProps(ComponentDefinition $def, array $attributes): array {
        $properties = $def->props['properties'] ?? [];
        $props = [];
        foreach ($attributes as $prop => $value) {
            $schema = $properties[$prop] ?? [];
            $type = $schema['type'] ?? 'string';
            if (is_array($type)) {
                $type = $type[0] ?? 'string';
            }
            if (($schema['format'] ?? '') === 'uri' && is_string($value)) {
                $props[$prop] = self::safeUri($value) ? $value : '';
                continue;
            }
            $props[$prop] = is_string($value) ? esc_html($value) : $value;
        }
        return $props;
    }

    private static function safeUri(string $value): bool {
        if ($value !== '' && $value[0] === '/' && ($value[1] ?? '') !== '/') {
            return true;
        }
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
            'id' => $def->id,
            'name' => self::blockName($ns, $def->id),
            'title' => $def->name,
            'category' => $category,
            'categoryTitle' => $def->group ?: 'Designbook',
            'attributes' => $attributes,
            'manifestAttributes' => $manifestAttrs,
            'slots' => $slots,
            'supports' => $supports,
            'ui' => $def->ui,
            'kind' => 'component',
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
        ]);
    }

    private static function writeBlockJson(array $payload): void {
        $dir = __DIR__ . '/blocks/' . $payload['id'];
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new \RuntimeException("Cannot write block metadata for {$payload['id']}");
        }
        $json = [
            'apiVersion' => 3,
            'name' => $payload['name'],
            'title' => $payload['title'],
            'category' => $payload['category'],
            'attributes' => $payload['attributes'],
            'supports' => $payload['supports'],
            'editorScript' => 'designbook-gutenberg-editor',
        ];
        file_put_contents($dir . '/block.json', json_encode($json, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n");
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
