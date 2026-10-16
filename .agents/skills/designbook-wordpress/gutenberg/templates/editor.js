(function (wp) {
  const { registerBlockType, getBlockType } = wp.blocks;
  const { InspectorControls, InnerBlocks, useBlockProps } = wp.blockEditor;
  const { PanelBody, TextControl, ToggleControl, SelectControl, TextareaControl, Notice } = wp.components;
  const { createElement: h, Fragment, useState } = wp.element;
  const data = window.designbookGutenberg || { blocks: [], slotBlock: 'designbook/slot' };

  function JsonControl({ label, value, onChange }) {
    const [text, setText] = useState(JSON.stringify(value ?? {}, null, 2));
    const [error, setError] = useState('');
    return h(
      Fragment,
      {},
      h(TextareaControl, {
        label,
        value: text,
        onChange(next) {
          setText(next);
          try {
            onChange(JSON.parse(next));
            setError('');
          } catch (e) {
            setError('Invalid JSON');
          }
        },
      }),
      error ? h(Notice, { status: 'error', isDismissible: false }, error) : null,
    );
  }

  function controlFor(attr, value, onChange) {
    const label = attr.title || attr.name;
    if (attr.enum) {
      return h(SelectControl, {
        label,
        value,
        options: attr.enum.map((v) => ({ label: String(v), value: v })),
        onChange,
      });
    }
    if (attr.type === 'boolean') {
      return h(ToggleControl, { label, checked: !!value, onChange });
    }
    if (attr.type === 'number' || attr.type === 'integer') {
      return h(TextControl, {
        label,
        type: 'number',
        value: value ?? '',
        onChange(v) {
          onChange(attr.type === 'integer' ? parseInt(v, 10) : parseFloat(v));
        },
      });
    }
    if (attr.type === 'object' || attr.type === 'array') {
      return h(JsonControl, { label, value, onChange });
    }
    return h(TextControl, {
      label,
      type: attr.format === 'uri' ? 'url' : 'text',
      value: value ?? '',
      onChange,
    });
  }

  (data.blocks || []).forEach(function (def) {
    if (getBlockType(def.name) && getBlockType(def.name).edit) return;
    registerBlockType(def.name, {
      edit(props) {
        const blockProps = useBlockProps();
        const controls = (def.attributes || []).map((attr) =>
          controlFor(attr, props.attributes[attr.name], (v) => {
            props.setAttributes({ [attr.name]: v });
          }),
        );
        const slotTemplate = (def.slots || []).map((slot) => [
          data.slotBlock,
          { name: slot.name, title: slot.title, lock: { move: true, remove: true } },
        ]);
        const inner =
          def.kind === 'slot'
            ? h(InnerBlocks, { templateLock: false })
            : h(InnerBlocks, {
                template: slotTemplate,
                templateLock: 'all',
                allowedBlocks: [data.slotBlock],
              });
        return h(
          'div',
          blockProps,
          controls.length ? h(InspectorControls, {}, h(PanelBody, { title: def.title }, controls)) : null,
          inner,
        );
      },
      save() {
        return h(InnerBlocks.Content);
      },
    });
  });
})(window.wp);
