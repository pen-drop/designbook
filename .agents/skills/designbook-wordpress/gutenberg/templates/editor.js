(function (wp) {
  const { registerBlockType, getBlockType, serialize } = wp.blocks;
  const { InspectorControls, InnerBlocks, useBlockProps } = wp.blockEditor;
  const { PanelBody, TextControl, ToggleControl, SelectControl, TextareaControl, Notice, Spinner } = wp.components;
  const { createElement: h, Fragment, useState, useEffect, useRef } = wp.element;
  const { useSelect } = wp.data;
  const apiFetch = wp.apiFetch;
  const data = window.designbookGutenberg || { blocks: [], slotBlock: 'designbook/slot' };

  function JsonControl({ label, value, onChange, kind }) {
    const [text, setText] = useState(JSON.stringify(value ?? (kind === 'array' ? [] : {}), null, 2));
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
            const parsed = JSON.parse(next);
            const isObj = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed);
            const isArr = Array.isArray(parsed);
            if (kind === 'object' && (isObj || (isArr && parsed.length === 0))) {
              onChange(isObj ? parsed : {});
              setError('');
            } else if (kind === 'array' && isArr) {
              onChange(parsed);
              setError('');
            } else {
              setError('Invalid JSON');
            }
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
          if (v === '') {
            return;
          }
          const n = attr.type === 'integer' ? parseInt(v, 10) : parseFloat(v);
          if (Number.isNaN(n)) {
            return;
          }
          onChange(n);
        },
      });
    }
    if (attr.type === 'object' || attr.type === 'array') {
      return h(JsonControl, { label, value, onChange, kind: attr.type });
    }
    return h(TextControl, {
      label,
      type: attr.format === 'uri' ? 'url' : 'text',
      value: value ?? '',
      onChange,
    });
  }

  function Preview({ clientId }) {
    const block = useSelect((select) => select('core/block-editor').getBlock(clientId), [clientId]);
    const postId = useSelect((select) => {
      try {
        return select('core/editor').getCurrentPostId() || 0;
      } catch (e) {
        return 0;
      }
    }, []);
    const [html, setHtml] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const gen = useRef(0);
    const serialized = block ? serialize([block]) : '';
    useEffect(() => {
      if (!serialized) return undefined;
      const id = ++gen.current;
      setPending(true);
      const controller = new AbortController();
      apiFetch({
        path: '/designbook/v1/gutenberg-preview',
        method: 'POST',
        data: { post_id: postId || 0, content: serialized },
        signal: controller.signal,
      })
        .then((res) => {
          if (id !== gen.current) return;
          setHtml((res && res.html) || '');
          setError('');
          setPending(false);
        })
        .catch((e) => {
          if (id !== gen.current) return;
          setHtml('');
          setError((e && e.message) || 'Preview failed');
          setPending(false);
        });
      return () => {
        controller.abort();
      };
    }, [serialized, postId]);
    if (pending && !html && !error) {
      return h('div', { 'aria-busy': 'true' }, h(Spinner), ' Loading preview');
    }
    if (error) {
      return h(Notice, { status: 'error', isDismissible: false }, error);
    }
    return h('div', { dangerouslySetInnerHTML: { __html: html } });
  }

  (data.blocks || []).forEach(function (def) {
    if (getBlockType(def.name) && getBlockType(def.name).edit) return;
    registerBlockType(def.name, {
      edit(props) {
        const blockProps = useBlockProps();
        const isPreview = useSelect((select) => {
          const settings = select('core/block-editor').getSettings() || {};
          return !!(settings.isPreviewMode || settings.__unstableIsPreviewMode);
        }, []);
        if (isPreview) {
          return h('div', blockProps, h(Preview, { clientId: props.clientId }));
        }
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
            ? h(InnerBlocks, { templateLock: false, allowedBlocks: data.allowedChildren })
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
