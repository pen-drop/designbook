<?php
namespace Designbook\Bricks;

use Designbook\ComponentDefinition;

/** Thin Bricks adapter: schema → controls, scene → page JSON, ui() → elements. */
final class Adapter {
    /** @return array<string, array<string, mixed>> */
    public static function controls(array $props): array {
        $required = array_flip($props['required'] ?? []);
        $controls = [];
        foreach ($props['properties'] ?? [] as $name => $schema) {
            $schema = is_array($schema) ? $schema : [];
            $type = isset($schema['enum']) ? 'select' : match ($schema['type'] ?? '') {
                'boolean' => 'checkbox',
                'number', 'integer' => 'number',
                default => ($schema['format'] ?? '') === 'uri' ? 'link' : 'text',
            };
            $control = ['tab' => 'content', 'label' => $schema['title'] ?? $name, 'type' => $type];
            if (array_key_exists('default', $schema)) $control['default'] = $schema['default'];
            if (isset($required[$name])) $control['required'] = true;
            if ($type === 'select') {
                $options = [];
                foreach ($schema['enum'] ?? [] as $value) $options[(string) $value] = (string) $value;
                $control['options'] = $options;
            }
            $controls[$name] = $control;
        }
        return $controls;
    }

    /** @param array<string, mixed> $node */
    public static function fromScene(array $node, string|int $parent = 0, string $seed = 'root'): array {
        $id = substr(md5($seed), 0, 6);
        $component = $node['component'] ?? '';
        $name = 'designbook-' . (str_contains($component, ':') ? substr($component, strrpos($component, ':') + 1) : $component);
        $children = [];
        $out = [];
        foreach ($node['slots'] ?? [] as $slotName => $contents) {
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

    /** @return list<array{hex: string, name: string}> */
    public static function palette(string $json): array {
        $out = [];
        foreach ((json_decode($json, true) ?: [])['settings']['color']['palette'] ?? [] as $entry) {
            if (!is_array($entry) || empty($entry['color'])) continue;
            $out[] = ['hex' => (string) $entry['color'], 'name' => (string) ($entry['name'] ?? $entry['slug'] ?? $entry['color'])];
        }
        return $out;
    }

    /** @param object{ui(): array, get(string): ?ComponentDefinition, render(string, array, array): string} $registry */
    public static function register(object $registry): void {
        if (!class_exists(\Bricks\Elements::class) || !class_exists(ComponentElement::class)) return;
        ComponentElement::$registry = $registry;
        foreach ($registry->ui() as $id => $_) {
            \Bricks\Elements::register_element(__FILE__, 'designbook-' . $id, ComponentElement::class);
        }
        \Bricks\Elements::register_element(__FILE__, 'designbook-slot', SlotElement::class);
        if (!function_exists('add_filter') || !function_exists('get_stylesheet_directory')) return;
        $themeJson = get_stylesheet_directory() . '/theme.json';
        if (!is_file($themeJson)) return;
        $colors = self::palette((string) file_get_contents($themeJson));
        add_filter('bricks/builder/color_palette', fn (array $existing) => array_merge($existing, $colors));
    }
}

if (class_exists(\Bricks\Element::class)) {

class ComponentElement extends \Bricks\Element {
    public $category = 'designbook';
    public $name = 'designbook-component';
    public $icon = 'ti-layout-grid2';
    public static mixed $registry = null;

    public function __construct($element = null) {
        parent::__construct($element);
        $this->nestable = ($this->definition()?->slots ?? []) !== [];
    }

    public function get_label() {
        return $this->definition()?->name ?? 'Designbook';
    }

    public function set_controls() {
        $this->controls = Adapter::controls($this->definition()?->props ?? ['type' => 'object']);
    }

    public function get_nestable_children() {
        $children = [];
        foreach ($this->definition()?->slots ?? [] as $name => $slot) {
            $children[] = [
                'name' => 'designbook-slot',
                'label' => is_array($slot) ? ($slot['title'] ?? $name) : $name,
                'settings' => ['designbookSlot' => $name],
            ];
        }
        return $children;
    }

    public function render() {
        $def = $this->definition();
        $keys = array_keys($def?->props['properties'] ?? []);
        $props = $keys ? array_intersect_key($this->settings, array_flip($keys)) : [];
        $slots = [];
        $slotNames = array_keys($def?->slots ?? []);
        if ($slotNames && class_exists(\Bricks\Frontend::class)) {
            $html = \Bricks\Frontend::render_children($this);
            foreach ($slotNames as $i => $name) $slots[$name] = $i === 0 ? $html : ''; // ponytail: first slot gets all children HTML; split per SlotElement when live Bricks is available
        }
        echo self::$registry?->render($this->componentId(), $props, $slots) ?? '';
    }

    private function componentId(): string {
        $name = $this->element['name'] ?? $this->name;
        return str_starts_with($name, 'designbook-') ? substr($name, 11) : $name;
    }

    private function definition(): ?ComponentDefinition {
        return self::$registry?->get($this->componentId());
    }
}

class SlotElement extends \Bricks\Element {
    public $category = 'designbook';
    public $name = 'designbook-slot';
    public $nestable = true;

    public function get_label() {
        return $this->settings['designbookSlot'] ?? 'Slot';
    }

    public function set_controls() {}

    public function render() {
        echo class_exists(\Bricks\Frontend::class) ? \Bricks\Frontend::render_children($this) : '';
    }
}

}
