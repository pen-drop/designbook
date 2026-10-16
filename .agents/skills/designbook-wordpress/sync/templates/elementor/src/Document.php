<?php

namespace Designbook\Elementor;

final class Document
{
    /** @param list<array<string, mixed>> $items */
    public static function fromScene(array $items, array $definitions, string $namespace): array
    {
        $seen = [];
        $elements = [];
        foreach ($items as $i => $item) {
            $elements[] = self::node($item, $definitions, $namespace, '/' . $i, $seen);
        }
        return $elements;
    }

    private static function node(array $item, array $definitions, string $namespace, string $path, array &$seen): array
    {
        self::trackDesignbookId($item, $seen);
        if (isset($item['component'])) {
            return self::component($item, $definitions, $namespace, $path, $seen);
        }
        if (($item['type'] ?? null) === 'image' || array_key_exists('src', $item) || array_key_exists('uri', $item)) {
            return self::image($item, $path);
        }
        return self::elementNode($item, $path);
    }

    private static function component(array $item, array $definitions, string $namespace, string $path, array &$seen): array
    {
        $id = self::componentId((string) $item['component']);
        if (!isset($definitions[$id])) {
            throw new \InvalidArgumentException("Unknown component '$id'");
        }
        $def = $definitions[$id];
        if (($def['ui'] ?? true) === false) {
            throw new \InvalidArgumentException("Component '$id' is ui: false and cannot be used as a palette node");
        }
        $slotDefs = $def['slots'] ?? [];
        foreach (array_keys($item['slots'] ?? []) as $slot) {
            if (!array_key_exists($slot, $slotDefs)) {
                throw new \InvalidArgumentException("Unknown slot '$slot' on component '$id'");
            }
        }
        $children = [];
        foreach ($slotDefs as $slot => $meta) {
            $slotPath = $path . '/slots/' . $slot;
            $title = is_array($meta) ? (string) ($meta['title'] ?? $slot) : (string) $slot;
            $raw = $item['slots'][$slot] ?? [];
            if (!is_array($raw) || self::isAssoc($raw)) {
                $raw = $raw === '' || $raw === null ? [] : [$raw];
            }
            $slotChildren = [];
            foreach (array_values($raw) as $j => $child) {
                if (!is_array($child)) {
                    $child = ['type' => 'element', 'value' => (string) $child];
                }
                $slotChildren[] = self::node($child, $definitions, $namespace, $slotPath . '/' . $j, $seen);
            }
            $children[] = [
                'id' => self::eid($slotPath),
                'elType' => 'container',
                'isInner' => true,
                'settings' => [
                    'designbook_slot' => (string) $slot,
                    '_title' => $title,
                ],
                'elements' => $slotChildren,
            ];
        }
        return [
            'id' => self::eid($path),
            'elType' => 'widget',
            'widgetType' => 'db_' . $namespace . '_' . $id,
            'settings' => $item['props'] ?? [],
            'elements' => $children,
        ];
    }

    private static function image(array $item, string $path): array
    {
        $src = (string) ($item['src'] ?? $item['uri'] ?? '');
        $attributes = $item['attributes'] ?? [];
        return [
            'id' => self::eid($path),
            'elType' => 'widget',
            'widgetType' => 'image',
            'settings' => [
                'src' => $src,
                'image' => ['url' => $src],
                'attributes' => $attributes,
            ],
            'elements' => [],
        ];
    }

    private static function elementNode(array $item, string $path): array
    {
        return [
            'id' => self::eid($path),
            'elType' => 'widget',
            'widgetType' => 'html',
            'settings' => [
                'tag' => $item['tag'] ?? 'div',
                'value' => $item['value'] ?? '',
                'attributes' => $item['attributes'] ?? [],
                'html' => $item['value'] ?? '',
            ],
            'elements' => [],
        ];
    }

    private static function componentId(string $component): string
    {
        $pos = strrpos($component, ':');
        return $pos === false ? $component : substr($component, $pos + 1);
    }

    private static function eid(string $path): string
    {
        return substr(sha1($path), 0, 7);
    }

    private static function trackDesignbookId(array $item, array &$seen): void
    {
        if (!array_key_exists('_designbook_id', $item)) {
            return;
        }
        $id = (string) $item['_designbook_id'];
        if (isset($seen[$id])) {
            throw new \InvalidArgumentException("Duplicate _designbook_id '$id'");
        }
        $seen[$id] = true;
    }

    private static function isAssoc(array $value): bool
    {
        return $value !== [] && array_keys($value) !== range(0, count($value) - 1);
    }
}
