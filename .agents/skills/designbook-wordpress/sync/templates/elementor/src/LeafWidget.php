<?php

namespace Designbook\Elementor;

use Designbook\ComponentDefinition;
use Designbook\ComponentRegistry;
use Elementor\Widget_Base;

class LeafWidget extends Widget_Base
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

    protected function register_controls(): void
    {
        Plugin::addMappedControls($this, $this->definition);
    }

    protected function render(): void
    {
        Plugin::renderComponent($this, $this->definition, $this->registry);
    }

    protected function content_template(): void
    {
    }
}
