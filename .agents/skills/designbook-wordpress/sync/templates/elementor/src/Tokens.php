<?php

namespace Designbook\Elementor;

use Elementor\Plugin as ElementorPlugin;

final class Tokens
{
    public static function mirrorKit(array $palette, array $fontFamilies): void
    {
        $kit = ElementorPlugin::$instance->kits_manager->get_active_kit();
        $kitId = $kit->get_main_id();
        $settings = get_post_meta($kitId, '_elementor_page_settings', true);
        if (!is_array($settings)) {
            $settings = [];
        }
        $colors = self::indexById($settings['custom_colors'] ?? []);
        foreach ($palette as $slug => $color) {
            if (!is_string($color) || $color === '') {
                continue;
            }
            $id = self::tokenId((string) $slug);
            $colors[$id] = ['_id' => $id, 'title' => $id, 'color' => $color];
        }
        $fonts = self::indexById($settings['custom_typography'] ?? []);
        foreach ($fontFamilies as $slug => $family) {
            if (!is_string($family) || $family === '') {
                continue;
            }
            $id = self::tokenId((string) $slug);
            $row = $fonts[$id] ?? ['_id' => $id, 'title' => $id];
            $row['typography_typography'] = 'custom';
            $row['typography_font_family'] = $family;
            $fonts[$id] = $row;
        }
        $settings['custom_colors'] = array_values($colors);
        $settings['custom_typography'] = array_values($fonts);
        update_post_meta($kitId, '_elementor_page_settings', $settings);
    }

    private static function tokenId(string $slug): string
    {
        $safe = strtolower(preg_replace('/[^a-zA-Z0-9]+/', '-', $slug) ?? $slug);
        return 'designbook-' . trim($safe, '-');
    }

    private static function indexById(array $rows): array
    {
        $out = [];
        foreach ($rows as $row) {
            if (!empty($row['_id'])) {
                $out[$row['_id']] = $row;
            }
        }
        return $out;
    }
}
