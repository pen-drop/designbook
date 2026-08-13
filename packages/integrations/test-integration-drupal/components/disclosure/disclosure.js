(function (Drupal, once) {
  Drupal.behaviors.disclosure = {
    attach(context) {
      once('disclosure', '[data-behavior="disclosure"]', context).forEach((trigger) => {
        const target = document.querySelector(trigger.getAttribute('aria-controls'));
        trigger.addEventListener('click', () => {
          const open = trigger.getAttribute('aria-expanded') === 'true';
          trigger.setAttribute('aria-expanded', String(!open));
          if (target) target.hidden = open;
        });
      });
    },
  };
})(Drupal, once);
