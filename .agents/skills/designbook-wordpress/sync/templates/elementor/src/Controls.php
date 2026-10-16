<?php

namespace Designbook\Elementor;

final class Controls
{
    /** @return list<array{id: string, type: string, label: string, options?: array<string, string>, default?: mixed, required?: bool}> */
    public static function map(array $schema): array
    {
        $required = array_fill_keys($schema['required'] ?? [], true);
        $controls = [];
        foreach ($schema['properties'] ?? [] as $id => $prop) {
            $prop = is_array($prop) ? $prop : [];
            self::rejectUnsupported($prop, (string) $id);
            $control = [
                'id' => (string) $id,
                'type' => self::controlType($prop, (string) $id),
                'label' => (string) ($prop['title'] ?? $id),
            ];
            if ($control['type'] === 'select') {
                $options = [];
                foreach ($prop['enum'] as $value) {
                    $options[(string) $value] = (string) $value;
                }
                $control['options'] = $options;
            }
            if (array_key_exists('default', $prop)) {
                $control['default'] = $prop['default'];
            }
            if (isset($required[$id])) {
                $control['required'] = true;
            }
            $controls[] = $control;
        }
        return $controls;
    }

    public static function decode(array $settings, array $schema): array
    {
        $props = [];
        foreach ($schema['properties'] ?? [] as $id => $prop) {
            $prop = is_array($prop) ? $prop : [];
            if (!array_key_exists($id, $settings)) {
                if (array_key_exists('default', $prop)) {
                    $props[$id] = $prop['default'];
                }
                continue;
            }
            $props[$id] = self::decodeValue($settings[$id], $prop, (string) $id);
        }
        return $props;
    }

    public static function validate(array $props, array $schema): void
    {
        $properties = $schema['properties'] ?? [];
        foreach ($schema['required'] ?? [] as $id) {
            if (!array_key_exists($id, $props)) {
                throw new \InvalidArgumentException("Missing required prop '$id'");
            }
        }
        foreach ($props as $id => $value) {
            if (!array_key_exists($id, $properties)) {
                throw new \InvalidArgumentException("Unexpected prop '$id'");
            }
        }
        foreach ($properties as $id => $prop) {
            if (!array_key_exists($id, $props)) {
                continue;
            }
            $prop = is_array($prop) ? $prop : [];
            self::rejectUnsupported($prop, (string) $id);
            self::validateValue($props[$id], $prop, (string) $id);
        }
    }

    private static function rejectUnsupported(array $prop, string $id): void
    {
        foreach (['oneOf', '$ref', 'not'] as $key) {
            if (array_key_exists($key, $prop)) {
                throw new \InvalidArgumentException("Unsupported schema construct '$key' on prop '$id'");
            }
        }
    }

    private static function controlType(array $prop, string $id): string
    {
        if (isset($prop['enum'])) {
            return 'select';
        }
        $type = $prop['type'] ?? null;
        return match ($type) {
            'boolean' => 'switcher',
            'integer', 'number' => 'number',
            'object', 'array' => 'textarea',
            'string' => (($prop['format'] ?? null) === 'uri') ? 'url' : 'text',
            default => throw new \InvalidArgumentException("Unsupported type on prop '$id'"),
        };
    }

    private static function decodeValue(mixed $value, array $prop, string $id): mixed
    {
        $type = self::controlType($prop, $id);
        return match ($type) {
            'switcher' => self::decodeSwitcher($value),
            'url' => is_array($value) ? (string) ($value['url'] ?? '') : (string) $value,
            'number' => ($prop['type'] ?? '') === 'integer' ? (int) $value : (float) $value,
            'textarea' => self::decodeJson($value, $id),
            default => $value,
        };
    }

    private static function decodeSwitcher(mixed $value): bool
    {
        if ($value === '' || $value === 'false' || $value === null || $value === false) {
            return false;
        }
        return in_array($value, ['yes', 'true', '1', true, 1], true);
    }

    private static function decodeJson(mixed $value, string $id): mixed
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || $value === '') {
            throw new \InvalidArgumentException("Invalid JSON for prop '$id'");
        }
        try {
            return json_decode($value, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new \InvalidArgumentException("Invalid JSON for prop '$id'", 0, $e);
        }
    }

    private static function validateValue(mixed $value, array $prop, string $id): void
    {
        if (isset($prop['enum']) && !in_array($value, $prop['enum'], true)) {
            throw new \InvalidArgumentException("Invalid enum value for prop '$id'");
        }
        $type = $prop['type'] ?? null;
        $ok = match ($type) {
            'boolean' => is_bool($value),
            'integer' => is_int($value),
            'number' => is_int($value) || is_float($value),
            'string' => is_string($value),
            'object' => is_array($value),
            'array' => is_array($value),
            default => isset($prop['enum']),
        };
        if (!$ok) {
            throw new \InvalidArgumentException("Invalid type for prop '$id'");
        }
        if (($prop['format'] ?? null) === 'uri') {
            if (!is_string($value) || !self::allowedUri($value)) {
                throw new \InvalidArgumentException("Invalid URI for prop '$id'");
            }
        }
    }

    private static function allowedUri(string $value): bool
    {
        if ($value === '') {
            return false;
        }
        if ($value[0] === '/' || $value[0] === '#') {
            return true;
        }
        $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));
        return in_array($scheme, ['http', 'https'], true);
    }
}
