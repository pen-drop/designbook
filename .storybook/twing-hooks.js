import { createSynchronousFunction } from "twing"

/**
 * Simple test function.
 */
function icon(context, pack_id, icon_id, settings) {
  if (icon_id) {
    return `<object width="24" height="24" data="https://cdn.jsdelivr.net/npm/heroicons@2.2.0/24/solid/${icon_id}.svg" type="image/svg+xml">
  <img src="https://cdn.jsdelivr.net/npm/heroicons@2.2.0/24/solid/${icon_id}.svg" />
</object>`

  }
}

export function initEnvironment(twingEnvironment, config = {}) {
  twingEnvironment.addFunction(createSynchronousFunction('icon', icon, [
    { name: 'icon_id' },
    { name: 'pack_id', defaultValue: '' },
    { name: 'settings', defaultValue: {} },
  ]));

}
