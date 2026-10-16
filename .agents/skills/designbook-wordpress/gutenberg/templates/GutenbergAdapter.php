<?php
namespace Designbook;

/** Registers Designbook components as dynamic Gutenberg blocks from the live registry. */
final class GutenbergAdapter {
    public static function register(ComponentRegistry $registry): void {
        $ns = strtolower(str_replace('_', '-', get_stylesheet()));
        $planned = [];
        $payloads = [];
        foreach ($registry->all() as $def) {
            $name = self::blockName($ns, $def->id);
            if (isset($planned[$name])) {
                throw new \RuntimeException("Block name collision: {$planned[$name]} and {$def->id} both map to $name");
            }
            $planned[$name] = $def->id;
            $payloads[] = self::blockPayload($ns, $def);
        }
        self::registerScript($ns, $payloads);
        foreach ($payloads as $payload) {
            self::writeBlockJson($payload);
            self::registerType($payload);
        }
        self::registerSlot($ns);
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
            ['wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components'],
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
            'render_callback' => static fn (array $attributes, string $content): string => $content,
        ]);
    }

    public static function renderBlock(array $attributes, string $content, \WP_Block $block): string {
        return $content;
    }
}
