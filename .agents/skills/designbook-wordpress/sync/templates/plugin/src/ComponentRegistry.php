<?php
namespace Designbook;

use Symfony\Component\Yaml\Yaml;
use Timber\Timber;

/** One component's interface from `<id>.schema.yml`; `ui` false keeps it out of builder editors. */
final class ComponentDefinition {
    public function __construct(
        public string $id,
        public string $name,
        public array $props,
        public array $slots,
        public bool $ui = true,
        public ?string $group = null,
    ) {}
}

/** Components of the active theme (`components/<id>/<id>.schema.yml` + `.twig`), rendered through Timber. */
final class ComponentRegistry {
    /** @var array<string, ComponentDefinition>|null */
    private ?array $definitions = null;

    public function __construct(private string $componentsDir, private string $namespace) {}

    /** @return array<string, ComponentDefinition> every component, including `ui: false` ones */
    public function all(): array {
        if ($this->definitions !== null) return $this->definitions;
        $this->definitions = [];
        foreach (glob($this->componentsDir . '/*/*.schema.yml') ?: [] as $file) {
            $id = basename(dirname($file));
            if (basename($file) !== "$id.schema.yml") continue;
            $s = Yaml::parseFile($file);
            $this->definitions[$id] = new ComponentDefinition(
                $id,
                $s['name'] ?? $id,
                $s['props'] ?? ['type' => 'object'],
                $s['slots'] ?? [],
                $s['ui'] ?? true,
                $s['group'] ?? null,
            );
        }
        ksort($this->definitions);
        return $this->definitions;
    }

    /** @return array<string, ComponentDefinition> the components builder adapters register */
    public function ui(): array {
        return array_filter($this->all(), fn (ComponentDefinition $d) => $d->ui);
    }

    public function get(string $id): ?ComponentDefinition {
        return $this->all()[$id] ?? null;
    }

    /** Slots are pre-rendered HTML strings keyed by slot name. */
    public function render(string $id, array $props = [], array $slots = []): string {
        if (!$this->get($id)) throw new \InvalidArgumentException("Unknown component: $id");
        return Timber::compile("@{$this->namespace}/$id/$id.twig", $props + $slots);
    }
}
