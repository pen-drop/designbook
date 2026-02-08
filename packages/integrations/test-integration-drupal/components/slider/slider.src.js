/**
 * Slider Behavior - Flicking with Arrow and Pagination plugins
 */
import Flicking from "@egjs/flicking";
import { Arrow, Pagination, AutoPlay } from "@egjs/flicking-plugins";

(function (Drupal, once) {
  "use strict";

  function initViewport(viewport) {

    let options = {};
    const raw = viewport.getAttribute("data-flicking-options");
    if (raw) {
      try { options = JSON.parse(raw); } catch (e) { console.warn("Invalid options", e); }
    }

    const showArrows = options.showArrows;
    const showPagination = options.showPagination;

    if (options.panelsPerView == null) options.panelsPerView = 1;

    const flicking = new Flicking(viewport, options);
    const plugins = [];

    // Only add Arrow if requested AND elements exist
    if (showArrows) {
      plugins.push(new Arrow({
        prevElSelector: ".flicking-arrow-prev",
        nextElSelector: ".flicking-arrow-next"
      }));
    }

    if (showPagination) {
      plugins.push(new Pagination({ type: "bullet" }));
    }

    if (options.autoPlay) {
      console.log(plugins);
      plugins.push(
        new AutoPlay({
          duration: options.autoplayDuration || 5000,
          direction: "NEXT",
          stopOnHover: true,
        })
      );
    }

    if (plugins.length) {
      flicking.addPlugins(...plugins);
    }

  }

  Drupal.behaviors.slider = {
    attach(context) {
      const viewports = once(
        "flicking",
        ".slider .flicking-viewport",
        context
      );
      viewports.forEach(initViewport);
    },
  };
})(Drupal, once);
