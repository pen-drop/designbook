<?php
namespace Designbook;

use Symfony\Component\Yaml\Yaml;
use Timber\Timber;

final class ComponentDefinition {
    public function __construct(public string $id, public string $name, public array $props, public array $slots) {}
}

/** Components of the active theme (`components/<id>/<id>.schema.yml` + `.twig`), rendered through Timber. */
final class ComponentRegistry {
    /** @var array<string, ComponentDefinition>|null */
    private ?array $definitions = null;

    public function __construct(private string $componentsDir, private string $namespace) {}

    /** @return array<string, ComponentDefinition> */
    public function all(): array {
        if ($this->definitions !== null) return $this->definitions;
        $this->definitions = [];
        foreach (glob($this->componentsDir . '/*/*.schema.yml') ?: [] as $file) {
            $id = basename(dirname($file));
            if (basename($file) !== "$id.schema.yml") continue;
            $s = Yaml::parseFile($file);
            $this->definitions[$id] = new ComponentDefinition($id, $s['name'] ?? $id, $s['props'] ?? ['type' => 'object'], $s['slots'] ?? []);
        }
        ksort($this->definitions);
        return $this->definitions;
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
