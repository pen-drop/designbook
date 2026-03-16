import React from 'react';
import { styled } from 'storybook/theming';

const gapMap = { '4': 16, '6': 24, '8': 32 };

const Layout = styled.div(({ theme }) => ({
  fontFamily: theme.typography?.fonts?.base,
  margin: '0 auto',
  paddingTop: 8,
  maxWidth: '1000px',
  width: '100%',
  paddingLeft: 8,
  paddingRight: 8

}));

export function DeboPageLayout({ gap = '4', children }) {
  const spacing = gapMap[gap] || 16;
  return (
    <Layout style={{ display: 'flex', flexDirection: 'column'}}>
      {children}
    </Layout>
  );
}

export const DeboSectionList = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
});
