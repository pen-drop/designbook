<?php
require_once ABSPATH . 'vendor/autoload.php';
Timber\Timber::init();
add_filter('timber/locations', function ($paths) {
    $paths['test_integration_wordpress'] = [get_stylesheet_directory() . '/components'];
    $paths[] = [get_stylesheet_directory() . '/views'];
    return $paths;
});
add_filter('timber/twig/environment/options', fn ($o) => ['autoescape' => false] + $o);
add_action('wp_enqueue_scripts', function () {
    $css = get_stylesheet_directory() . '/css/app.css';
    if (is_file($css)) wp_enqueue_style(get_stylesheet(), get_stylesheet_directory_uri() . '/css/app.css', [], (string) filemtime($css));
});
