(function (Drupal, once) {
  Drupal.behaviors.toggle = {
    attach(context) {
      once('toggle', '[data-behavior="toggle"]', context);
    },
  };
})(Drupal, once);
