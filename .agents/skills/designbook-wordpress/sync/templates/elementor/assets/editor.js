(function () {
  function nestedTypes() {
    return (window.designbookElementor && window.designbookElementor.nested) || [];
  }

  function isDesignbookNested(widgetType) {
    return nestedTypes().indexOf(widgetType) !== -1;
  }

  elementorCommon.elements.$window.on("elementor/nested-element-type-loaded", function () {
    var NestedView = $e.components.get("nested-elements").exports.NestedView;
    var NestedElementBase = elementor.modules.elements.types.NestedElementBase;

    var DesignbookNestedView = NestedView.extend({
      getChildViewContainer: function (containerView, childView) {
        var settings = childView.model.get("settings");
        var slot = settings && (settings.get ? settings.get("designbook_slot") : settings.designbook_slot);
        if (slot) {
          var mount = containerView.$el.find('[data-slot="' + slot + '"]');
          if (mount.length) {
            return mount;
          }
        }
        return NestedView.prototype.getChildViewContainer.apply(this, arguments);
      },
    });

    nestedTypes().forEach(function (type) {
      var Type = NestedElementBase.extend({
        getType: function () {
          return type;
        },
        getView: function () {
          return DesignbookNestedView;
        },
      });
      elementor.elementsManager.registerElementType(new Type());
    });
  });

  elementor.hooks.addFilter("elements/container/contextMenuGroups", function (groups, view) {
    var settings = view.model.get("settings");
    var slot = settings && (settings.get ? settings.get("designbook_slot") : settings.designbook_slot);
    if (!slot) {
      return groups;
    }
    return groups
      .map(function (group) {
        if (!group.actions) {
          return group;
        }
        group.actions = group.actions.filter(function (action) {
          return ["delete", "duplicate", "copy", "paste"].indexOf(action.name) === -1;
        });
        return group;
      })
      .filter(function (group) {
        return !group.actions || group.actions.length;
      });
  });
})();
