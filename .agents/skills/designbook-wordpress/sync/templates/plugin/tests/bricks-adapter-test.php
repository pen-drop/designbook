<?php
// Adapter checks that do not need WordPress or a licensed Bricks install.
// Run: php -d zend.assertions=1 -d assert.exception=1 tests/bricks-adapter-test.php

namespace Bricks {
    class Element {
        public $category = '';
        public $name = '';
        public $icon = '';
        public $nestable = false;
        public $controls = [];
        public $settings = [];
        public $element = [];
        public function __construct($element = null) {
            if (is_array($element)) {
                $this->element = $element;
                $this->name = $element['name'] ?? $this->name;
                $this->settings = $element['settings'] ?? [];
            }
        }
    }
    class Elements {
        /** @var list<array{file:string,name:string,class:string}> */
        public static array $registered = [];
        public static function register_element($file, $name = '', $class = '') {
            self::$registered[] = ['file' => $file, 'name' => $name, 'class' => $class];
        }
    }
    class Frontend {
        public static function render_children($el): string {
            return (string) ($el->settings['_slotHtml'] ?? '');
        }
    }
}

namespace {
    require_once __DIR__ . '/../src/BricksAdapter.php';
    require_once __DIR__ . '/../src/ComponentRegistry.php';

    use Designbook\Bricks\Adapter;
    use Designbook\Bricks\ComponentElement;
    use Designbook\ComponentDefinition;

    $controls = Adapter::controls([
        'type' => 'object',
        'properties' => [
            'title' => ['type' => 'string', 'title' => 'Title', 'default' => 'Hello'],
            'featured' => ['type' => 'boolean'],
            'href' => ['type' => 'string', 'format' => 'uri'],
            'count' => ['type' => 'integer'],
            'weight' => ['type' => 'number'],
            'tone' => ['type' => 'string', 'enum' => ['info', 'warn']],
        ],
        'required' => ['title'],
    ]);
    assert($controls['title']['type'] === 'text' && $controls['title']['default'] === 'Hello' && !empty($controls['title']['required']), 'string + default + required');
    assert($controls['featured']['type'] === 'checkbox', 'boolean → checkbox');
    assert($controls['href']['type'] === 'link', 'format uri → link');
    assert($controls['count']['type'] === 'number' && $controls['weight']['type'] === 'number', 'number/integer → number');
    assert($controls['tone']['type'] === 'select' && $controls['tone']['options'] === ['info' => 'info', 'warn' => 'warn'], 'enum → select');

    $elements = Adapter::fromScene([
        'component' => 'demo:card',
        'props' => ['title' => 'Soup'],
        'slots' => [
            'media' => [['component' => 'image', 'props' => ['alt' => 'bowl']]],
            'content' => [],
        ],
    ]);
    $byName = [];
    foreach ($elements as $el) {
        assert(preg_match('/^[a-z0-9]{6}$/', $el['id']), '6-char id');
        assert(isset($el['name'], $el['parent'], $el['children'], $el['settings']));
        $byName[$el['name']][] = $el;
    }
    assert($byName['designbook-card'][0]['parent'] === 0 && $byName['designbook-card'][0]['settings']['title'] === 'Soup', 'root component + props');
    assert(count($byName['designbook-slot']) === 2, 'one region per named slot');
    $media = array_values(array_filter($byName['designbook-slot'], fn ($e) => ($e['settings']['designbookSlot'] ?? '') === 'media'))[0];
    $image = $byName['designbook-image'][0];
    assert($image['parent'] === $media['id'] && in_array($image['id'], $media['children'], true), 'nested component lives in its slot');

    assert(Adapter::palette(json_encode([
        'settings' => ['color' => ['palette' => [
            ['slug' => 'surface', 'name' => 'Surface', 'color' => '#fffbf2'],
        ]]],
    ])) === [['hex' => '#fffbf2', 'name' => 'Surface']], 'theme.json colors → Bricks palette');

    $registry = new class {
        public function ui(): array {
            return [
                'card' => new ComponentDefinition(
                    'card',
                    'Card',
                    ['type' => 'object', 'properties' => ['title' => ['type' => 'string']]],
                    ['media' => ['title' => 'Media']],
                ),
            ];
        }
        public function get(string $id): ?ComponentDefinition {
            return $this->ui()[$id] ?? null;
        }
        public function render(string $id, array $props = [], array $slots = []): string {
            return '<card>' . ($props['title'] ?? '') . ($slots['media'] ?? '') . '</card>';
        }
    };
    Adapter::register($registry);
    $names = array_column(\Bricks\Elements::$registered, 'name');
    assert($names === ['designbook-card', 'designbook-slot'], 'registers ui components plus the slot region');

    $el = new ComponentElement([
        'name' => 'designbook-card',
        'settings' => ['title' => 'Soup', '_slotHtml' => '<img>'],
    ]);
    ComponentElement::$registry = $registry;
    ob_start();
    $el->render();
    assert(ob_get_clean() === '<card>Soup<img></card>', 'render goes through ComponentRegistry::render');

    echo "OK\n";
}
