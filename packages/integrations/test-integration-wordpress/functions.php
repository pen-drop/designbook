<?php
require_once ABSPATH . 'vendor/autoload.php';
Timber\Timber::init();
add_filter('timber/locations', function ($paths) {
    $paths['test_integration_wordpress'] = [get_stylesheet_directory() . '/components'];
    $paths[] = [get_stylesheet_directory() . '/views'];
    return $paths;
});
add_filter('timber/twig/environment/options', fn ($o) => ['autoescape' => false] + $o);
