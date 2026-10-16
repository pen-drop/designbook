<?php
namespace Designbook\Bricks;

use Designbook\ComponentDefinition;

/** Loaded from Adapter::register after Bricks is present (it is a theme). */
class ComponentElement extends \Bricks\Element {
    public $category = 'designbook';
    public $name = 'designbook-component';
    public $icon = 'ti-layout-grid2';
    public static mixed $registry = null;

    public function get_label() {
        return $this->definition()?->name ?? 'Designbook';
    }

    public function set_controls() {
        $this->controls = Controls::fromSchema($this->definition()?->props ?? ['type' => 'object']);
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
        if (isset($props['href']) && is_array($props['href'])) $props['href'] = $props['href']['url'] ?? '';
        $slots = [];
        $slotNames = array_keys($def?->slots ?? []);
        if ($slotNames && class_exists(\Bricks\Frontend::class)) {
            $html = \Bricks\Frontend::render_children($this);
            foreach ($slotNames as $i => $name) $slots[$name] = $i === 0 ? $html : '';
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

    public function __construct($element = null) {
        parent::__construct($element);
        $this->nestable = ($this->definition()?->slots ?? []) !== [];
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
