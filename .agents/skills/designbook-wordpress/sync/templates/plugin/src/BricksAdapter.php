<?php
namespace Designbook\Bricks;

use Designbook\ComponentDefinition;

/** JSON Schema props → Bricks element controls (ADAPT-02). */
final class Controls {
    /** @return array<string, array<string, mixed>> */
    public static function fromSchema(array $props): array {
        $required = array_flip($props['required'] ?? []);
        $controls = [];
        foreach ($props['properties'] ?? [] as $name => $schema) {
            $schema = is_array($schema) ? $schema : [];
            $control = [
                'tab' => 'content',
                'label' => $schema['title'] ?? $name,
                'type' => self::type($schema),
            ];
            if (array_key_exists('default', $schema)) $control['default'] = $schema['default'];
            if (isset($required[$name])) $control['required'] = true;
            if ($control['type'] === 'select') {
                $options = [];
                foreach ($schema['enum'] ?? [] as $value) $options[(string) $value] = (string) $value;
                $control['options'] = $options;
            }
            $controls[$name] = $control;
        }
        return $controls;
    }

    private static function type(array $schema): string {
        if (isset($schema['enum'])) return 'select';
        if (($schema['type'] ?? '') === 'boolean') return 'checkbox';
        if (($schema['format'] ?? '') === 'uri') return 'link';
        if (in_array($schema['type'] ?? '', ['number', 'integer'], true)) return 'number';
        return 'text';
    }
}

/** Scene component tree → flat Bricks `_bricks_page_content_2` list. */
final class PageContent {
    /** @param array<string, mixed> $node */
    public static function fromScene(array $node, string|int $parent = 0, string $seed = 'root'): array {
        $id = substr(md5($seed), 0, 6);
        $name = self::elementName($node['component'] ?? '');
        $slots = $node['slots'] ?? [];
        $children = [];
        $out = [];
        foreach ($slots as $slotName => $contents) {
            $slotId = substr(md5("$seed.slot.$slotName"), 0, 6);
            $childIds = [];
            $nodes = $contents === [] || $contents === null ? [] : (array_is_list($contents) ? $contents : [$contents]);
            foreach ($nodes as $j => $child) {
                if (!is_array($child)) continue;
                $branch = self::fromScene($child, $slotId, "$seed.$slotName.$j");
                $childIds[] = $branch[0]['id'];
                array_push($out, ...$branch);
            }
            $out[] = [
                'id' => $slotId,
                'name' => 'designbook-slot',
                'parent' => $id,
                'children' => $childIds,
                'settings' => ['designbookSlot' => (string) $slotName],
                'label' => (string) $slotName,
            ];
            $children[] = $slotId;
        }
        array_unshift($out, [
            'id' => $id,
            'name' => $name,
            'parent' => $parent,
            'children' => $children,
            'settings' => is_array($node['props'] ?? null) ? $node['props'] : [],
        ]);
        return $out;
    }

    public static function elementName(string $component): string {
        $id = str_contains($component, ':') ? substr($component, strrpos($component, ':') + 1) : $component;
        return 'designbook-' . $id;
    }
}

/** theme.json color palette → `bricks/builder/color_palette` entries. */
final class Palette {
    /** @return list<array{hex: string, name: string}> */
    public static function fromThemeJson(string $json): array {
        $data = json_decode($json, true) ?: [];
        $out = [];
        foreach ($data['settings']['color']['palette'] ?? [] as $entry) {
            if (!is_array($entry) || empty($entry['color'])) continue;
            $out[] = ['hex' => (string) $entry['color'], 'name' => (string) ($entry['name'] ?? $entry['slug'] ?? $entry['color'])];
        }
        return $out;
    }
}

/** Registers one Bricks element per `ui()` definition and the nestable slot region. */
final class Adapter {
    /** @param object{ui(): array, get(string): ?ComponentDefinition, render(string, array, array): string} $registry */
    public static function register(object $registry): void {
        if (!class_exists(\Bricks\Elements::class) || !class_exists(\Bricks\Element::class)) return;
        require_once __DIR__ . '/BricksElements.php';
        ComponentElement::$registry = $registry;
        $file = __DIR__ . '/BricksElements.php';
        foreach ($registry->ui() as $id => $_) {
            \Bricks\Elements::register_element($file, 'designbook-' . $id, ComponentElement::class);
        }
        \Bricks\Elements::register_element($file, 'designbook-slot', SlotElement::class);
        if (function_exists('add_filter')) {
            add_filter('bricks/builder/i18n', function (array $i18n) {
                $i18n['designbook'] = 'Designbook';
                return $i18n;
            });
            $themeJson = function_exists('get_stylesheet_directory') ? get_stylesheet_directory() . '/theme.json' : '';
            if ($themeJson !== '' && is_file($themeJson)) {
                $colors = Palette::fromThemeJson((string) file_get_contents($themeJson));
                add_filter('bricks/builder/color_palette', fn (array $existing) => array_merge($existing, $colors));
            }
        }
    }
}
