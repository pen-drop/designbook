<?php

namespace Designbook\Elementor;

use Designbook\ComponentDefinition;
use Designbook\ComponentRegistry;
use Elementor\Modules\NestedElements\Base\Widget_Nested_Base;

class NestedWidget extends Widget_Nested_Base
{
    private ComponentDefinition $definition;
    private ComponentRegistry $registry;
    private string $namespace;

    public function __construct($data = [], $args = null)
    {
        $this->definition = $args['definition'];
        $this->registry = $args['registry'];
        $this->namespace = $args['namespace'];
        parent::__construct($data, $args);
    }

    public function get_name(): string
    {
        return 'db_' . $this->namespace . '_' . $this->definition->id;
    }

    public function get_title(): string
    {
        return $this->definition->name;
    }

    public function get_categories(): array
    {
        if ($this->definition->group) {
            $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $this->definition->group) ?? '');
            return [trim($slug, '-') ?: 'designbook'];
        }
        return ['designbook'];
    }

    public function get_stack($with_common_controls = true): array
    {
        return parent::get_stack(false);
    }

    public function is_reload_preview_required(): bool
    {
        return true;
    }

    protected function get_default_children_elements(): array
    {
        $elements = [];
        foreach ($this->definition->slots as $key => $meta) {
            $title = is_array($meta) ? (string) ($meta['title'] ?? $key) : (string) $key;
            $elements[] = [
                'elType' => 'container',
                'settings' => [
                    'designbook_slot' => (string) $key,
                    '_title' => $title,
                ],
            ];
        }
        return $elements;
    }

    protected function get_default_repeater_title_setting_key(): string
    {
        return '_title';
    }

    protected function get_default_children_title(): string
    {
        return '%s';
    }

    protected function get_default_children_placeholder_selector(): string
    {
        return '[data-slot]';
    }

    protected function register_controls(): void
    {
        Plugin::addMappedControls($this, $this->definition);
    }

    protected function render(): void
    {
        $slots = [];
        $index = 0;
        foreach (array_keys($this->definition->slots) as $name) {
            ob_start();
            $this->print_child($index);
            $html = ob_get_clean();
            $slots[$name] = '<div data-slot="' . esc_attr((string) $name) . '" style="display:contents">' . $html . '</div>';
            $index++;
        }
        Plugin::renderComponent($this, $this->definition, $this->registry, $slots);
    }

    protected function content_template(): void
    {
    }
}
