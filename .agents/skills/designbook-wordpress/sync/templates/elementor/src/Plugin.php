<?php

namespace Designbook\Elementor;

use Designbook\ComponentDefinition;
use Designbook\ComponentRegistry;
use Elementor\Controls_Manager;
use Elementor\Plugin as ElementorPlugin;
use Elementor\Widget_Base;

final class Plugin
{
    private static string $namespace = '';
    private static string $dir = '';
    private static ?ComponentRegistry $registry = null;
    private static bool $widgetsRegistered = false;

    public static function boot(string $namespace, string $dir): void
    {
        self::$namespace = $namespace;
        self::$dir = $dir;
        add_action('admin_notices', [self::class, 'adminNotice']);
        add_action('designbook/register_components', [self::class, 'onRegistry']);
        add_action('elementor/widgets/register', [self::class, 'onWidgetsManager']);
        add_action('elementor/elements/categories_registered', [self::class, 'onCategories']);
        add_action('elementor/editor/after_enqueue_scripts', [self::class, 'enqueueEditor']);
        add_action('elementor/preview/enqueue_styles', [self::class, 'enqueuePreviewCss']);
        add_action('elementor/element/container/section_layout/after_section_end', [self::class, 'stripSlotContainerStyle']);
        add_action('elementor/document/after_save', [self::class, 'keepPageTemplate']);
    }

    public static function supportError(?string $version = null): ?string
    {
        $version ??= defined('ELEMENTOR_VERSION') ? ELEMENTOR_VERSION : null;
        if ($version === null || !class_exists(ElementorPlugin::class)) {
            return 'Elementor is missing';
        }
        if ($version !== '4.3.5') {
            return "Elementor version $version is unsupported; pin 4.3.5";
        }
        if (!class_exists(\Elementor\Modules\NestedElements\Base\Widget_Nested_Base::class)) {
            return 'Nested Elements unavailable';
        }
        if (isset(ElementorPlugin::$instance) && ElementorPlugin::$instance->experiments) {
            $exp = ElementorPlugin::$instance->experiments;
            if (!$exp->is_feature_active('nested-elements') || !$exp->is_feature_active('container')) {
                return 'Nested Elements unavailable';
            }
        }
        return null;
    }

    public static function adminNotice(): void
    {
        $error = self::supportError();
        if ($error === null) {
            return;
        }
        echo '<div class="notice notice-error"><p>' . esc_html($error) . '</p></div>';
    }

    public static function onRegistry(ComponentRegistry $registry): void
    {
        self::$registry = $registry;
        self::registerWidgets();
    }

    public static function onWidgetsManager(): void
    {
        self::registerWidgets();
    }

    public static function onCategories($manager): void
    {
        $manager->add_category('designbook', ['title' => 'Designbook']);
        if (!self::$registry) {
            return;
        }
        foreach (self::$registry->ui() as $def) {
            if ($def->group) {
                $slug = self::categorySlug($def->group);
                $manager->add_category($slug, ['title' => $def->group]);
            }
        }
    }

    public static function enqueueEditor(): void
    {
        if (self::supportError() !== null) {
            return;
        }
        $src = self::$dir . '/assets/editor.js';
        if (!is_file($src)) {
            return;
        }
        wp_enqueue_script(
            'designbook-elementor-editor',
            plugins_url('assets/editor.js', self::$dir . '/plugin.php'),
            ['elementor-editor'],
            '4.3.5',
            true,
        );
        $nested = [];
        if (self::$registry) {
            foreach (self::$registry->ui() as $def) {
                if ($def->slots) {
                    $nested[] = 'db_' . self::$namespace . '_' . $def->id;
                }
            }
        }
        wp_localize_script('designbook-elementor-editor', 'designbookElementor', ['nested' => $nested]);
    }

    public static function enqueuePreviewCss(): void
    {
        $css = get_stylesheet_directory() . '/css/app.css';
        if (is_file($css)) {
            wp_enqueue_style('designbook-theme', get_stylesheet_directory_uri() . '/css/app.css', [], (string) filemtime($css));
        }
    }

    public static function keepPageTemplate($document): void
    {
        $postId = method_exists($document, 'get_main_id') ? (int) $document->get_main_id() : 0;
        if ($postId && get_post_meta($postId, '_designbook_id', true)) {
            update_post_meta($postId, '_wp_page_template', 'elementor-designbook.php');
        }
    }

    public static function stripSlotContainerStyle($element): void
    {
        $editor = ElementorPlugin::$instance->editor ?? null;
        if (!$editor || !$editor->is_edit_mode()) {
            return;
        }
        $settings = self::rawElementSettings($element);
        if (($settings['designbook_slot'] ?? '') === '') {
            return;
        }
        foreach ($element->get_controls() as $id => $control) {
            $tab = $control['tab'] ?? '';
            if ($tab === Controls_Manager::TAB_STYLE || $tab === Controls_Manager::TAB_ADVANCED) {
                $element->remove_control($id);
            }
        }
    }

    private static function rawElementSettings(object $element): array
    {
        try {
            $ref = new \ReflectionClass($element);
            while ($ref && !$ref->hasProperty('data')) {
                $ref = $ref->getParentClass();
            }
            if (!$ref) {
                return [];
            }
            $prop = $ref->getProperty('data');
            $prop->setAccessible(true);
            $data = $prop->getValue($element);
            return is_array($data['settings'] ?? null) ? $data['settings'] : [];
        } catch (\Throwable $e) {
            return [];
        }
    }

    public static function addMappedControls(Widget_Base $widget, ComponentDefinition $definition): void
    {
        $widget->start_controls_section('designbook_content', ['label' => $definition->name]);
        foreach (Controls::map($definition->props) as $control) {
            $args = [
                'label' => $control['label'],
                'type' => match ($control['type']) {
                    'url' => Controls_Manager::URL,
                    'switcher' => Controls_Manager::SWITCHER,
                    'number' => Controls_Manager::NUMBER,
                    'select' => Controls_Manager::SELECT,
                    'textarea' => Controls_Manager::TEXTAREA,
                    default => Controls_Manager::TEXT,
                },
            ];
            if (isset($control['options'])) {
                $args['options'] = $control['options'];
            }
            if (array_key_exists('default', $control)) {
                $args['default'] = $control['default'];
            }
            $widget->add_control($control['id'], $args);
        }
        $widget->end_controls_section();
    }

    public static function renderComponent(Widget_Base $widget, ComponentDefinition $definition, ComponentRegistry $registry, array $slots = []): void
    {
        $props = Controls::decode($widget->get_settings_for_display(), $definition->props);
        try {
            Controls::validate($props, $definition->props);
        } catch (\InvalidArgumentException $e) {
            echo '<!-- ' . esc_html($e->getMessage()) . ' -->';
            return;
        }
        echo $registry->render($definition->id, $props, $slots);
    }

    public static function componentNamespace(): string
    {
        return self::$namespace;
    }

    public static function registry(): ?ComponentRegistry
    {
        return self::$registry;
    }

    private static function registerWidgets(): void
    {
        if (self::$widgetsRegistered || self::$registry === null || self::supportError() !== null) {
            return;
        }
        if (!isset(ElementorPlugin::$instance) || !ElementorPlugin::$instance->widgets_manager) {
            return;
        }
        $manager = ElementorPlugin::$instance->widgets_manager;
        foreach (self::$registry->ui() as $def) {
            $args = [
                'definition' => $def,
                'registry' => self::$registry,
                'namespace' => self::$namespace,
            ];
            $widget = $def->slots
                ? new NestedWidget([], $args)
                : new LeafWidget([], $args);
            $manager->register($widget);
        }
        self::$widgetsRegistered = true;
    }

    private static function categorySlug(string $group): string
    {
        $slug = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $group) ?? $group);
        return trim($slug, '-') ?: 'designbook';
    }
}
