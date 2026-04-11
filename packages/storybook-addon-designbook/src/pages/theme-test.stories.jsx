import React from 'react';
import { useTheme } from 'storybook/theming';

function ThemeTest() {
  const theme = useTheme();
  return React.createElement(
    'div',
    { style: { padding: 20, fontFamily: 'monospace' } },
    React.createElement('h2', null, 'Theme Test'),
    React.createElement('p', null, 'theme.base: ', React.createElement('strong', null, theme.base)),
    React.createElement(
      'p',
      null,
      'theme.color.defaultText: ',
      React.createElement('strong', null, theme.color?.defaultText),
    ),
    React.createElement('p', null, 'theme.barBg: ', React.createElement('strong', null, theme.barBg)),
    React.createElement(
      'pre',
      {
        style: {
          background: theme.background?.hoverable,
          color: theme.color?.defaultText,
          padding: 10,
          maxHeight: 300,
          overflow: 'auto',
        },
      },
      JSON.stringify(theme, null, 2),
    ),
  );
}

export default {
  title: 'Designbook/Theme Test',
  tags: ['!autodocs'],
  parameters: { layout: 'centered' },
};

export const UseThemeHook = {
  render: () => React.createElement(ThemeTest),
};
