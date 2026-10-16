<?php

namespace Designbook\Elementor;

use Elementor\Plugin as ElementorPlugin;

final class Seed
{
    public static function upsert(string $designbookId, array $elements, array $images = []): int
    {
        if (class_exists(__NAMESPACE__ . '\\Plugin', false)) {
            $error = Plugin::supportError();
            if ($error !== null) {
                throw new \InvalidArgumentException($error);
            }
        } elseif (!defined('ELEMENTOR_VERSION') || ELEMENTOR_VERSION !== '4.3.5') {
            throw new \InvalidArgumentException('Elementor version unsupported; pin 4.3.5');
        }
        $found = get_posts([
            'post_type' => 'page',
            'post_status' => 'any',
            'meta_key' => '_designbook_id',
            'meta_value' => $designbookId,
            'numberposts' => -1,
            'fields' => 'ids',
        ]);
        if (count($found) > 1) {
            throw new \InvalidArgumentException("Duplicate _designbook_id '$designbookId'");
        }
        self::assertWidgets($elements);
        $elements = self::resolveImages($elements, $images, $designbookId);

        $created = false;
        if ($found) {
            $postId = (int) $found[0];
        } else {
            $postId = wp_insert_post([
                'post_type' => 'page',
                'post_status' => 'publish',
                'post_title' => $designbookId,
            ], true);
            if (is_wp_error($postId)) {
                throw new \InvalidArgumentException($postId->get_error_message());
            }
            $created = true;
        }

        update_post_meta($postId, '_designbook_id', $designbookId);
        update_post_meta($postId, '_elementor_edit_mode', 'builder');
        update_post_meta($postId, '_elementor_template_type', 'wp-page');
        update_post_meta($postId, '_elementor_version', '4.3.5');
        update_post_meta($postId, '_wp_page_template', 'elementor-designbook.php');

        $document = ElementorPlugin::$instance->documents->get($postId);
        if (!$document) {
            if ($created) {
                wp_delete_post($postId, true);
            }
            throw new \InvalidArgumentException("Elementor document missing for post $postId");
        }
        $ok = $document->save([
            'settings' => ['post_status' => 'publish'],
            'elements' => $elements,
        ]);
        if ($ok === false) {
            if ($created) {
                wp_delete_post($postId, true);
            }
            throw new \InvalidArgumentException("Elementor save failed for '$designbookId'");
        }
        return $postId;
    }

    private static function assertWidgets(array $elements): void
    {
        foreach ($elements as $el) {
            if (($el['elType'] ?? '') === 'widget') {
                $type = $el['widgetType'] ?? '';
                if (!ElementorPlugin::$instance->widgets_manager->get_widget_types($type)) {
                    throw new \InvalidArgumentException("Unknown widget type '$type'");
                }
            }
            if (!empty($el['elements']) && is_array($el['elements'])) {
                self::assertWidgets($el['elements']);
            }
        }
    }

    private static function resolveImages(array $elements, array $images, string $designbookId): array
    {
        foreach ($elements as &$el) {
            if (isset($el['settings']['src']) && is_string($el['settings']['src'])) {
                $el['settings']['src'] = self::attachmentUrl($el['settings']['src'], $images, $designbookId);
                if (isset($el['settings']['image']['url'])) {
                    $el['settings']['image']['url'] = $el['settings']['src'];
                }
            }
            if (!empty($el['elements']) && is_array($el['elements'])) {
                $el['elements'] = self::resolveImages($el['elements'], $images, $designbookId);
            }
        }
        return $elements;
    }

    private static function attachmentUrl(string $src, array $images, string $designbookId): string
    {
        if (preg_match('#^(https?:)?//#', $src) || str_starts_with($src, '/wp-content/uploads')) {
            return $src;
        }
        $path = $images[$src] ?? $src;
        if (!is_file($path)) {
            return $src;
        }
        $key = $designbookId . ':' . $src;
        $existing = get_posts([
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'meta_key' => '_designbook_id',
            'meta_value' => $key,
            'numberposts' => 1,
            'fields' => 'ids',
        ]);
        if ($existing) {
            return wp_get_attachment_url((int) $existing[0]) ?: $src;
        }
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';
        $tmp = wp_tempnam($path);
        copy($path, $tmp);
        $file = [
            'name' => basename($path),
            'tmp_name' => $tmp,
        ];
        $id = media_handle_sideload($file, 0);
        if (is_wp_error($id)) {
            @unlink($tmp);
            throw new \InvalidArgumentException($id->get_error_message());
        }
        update_post_meta($id, '_designbook_id', $key);
        return wp_get_attachment_url($id) ?: $src;
    }
}
