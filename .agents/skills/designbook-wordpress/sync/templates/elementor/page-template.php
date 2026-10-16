<?php
if (!defined('ABSPATH')) {
    exit;
}
?><!doctype html>
<html <?php language_attributes(); ?>>
<head><?php wp_head(); ?></head>
<body <?php body_class(); ?>>
<?php
if (class_exists(\Timber\Timber::class)) {
    \Timber\Timber::render('parts/header.twig', \Timber\Timber::context());
}
while (have_posts()) {
    the_post();
    the_content();
}
if (class_exists(\Timber\Timber::class)) {
    \Timber\Timber::render('parts/footer.twig', \Timber\Timber::context());
}
wp_footer();
?>
</body>
</html>
