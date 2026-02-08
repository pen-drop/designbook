
const storyNodesRenderer = [
  {
    appliesTo: (item) => item?.type === 'icon',
    render: (item) => {
      const attrs = item.attributes
        ? ' ' +
        Object.entries(item.attributes)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return `${key}="${value.join(' ')}"`
            }
            return `${key}="${value}"`
          })
          .join(' ')
        : ''
      return JSON.stringify(
        `<img href="https://cdn.jsdelivr.net/npm/heroicons@2.2.0/24/solid/${item.icon_id}.svg"/>`
      )
    },
    priority: -4,
  },
];
