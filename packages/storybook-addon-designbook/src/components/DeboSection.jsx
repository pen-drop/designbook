import React from 'react';
import { styled } from 'storybook/theming';
import { useDesignbookData } from '../hooks/useDesignbookData.js';
import { DeboEmptyState } from './ui/DeboEmptyState.jsx';
import { DeboLoading } from './ui/DeboLoading.jsx';
import { DeboPageLayout } from './ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from './ui/DeboSourceFooter.jsx';
import { DeboAlert } from './ui/DeboAlert.jsx';

const SectionHeading = styled.h2(({ theme }) => ({
  fontSize: theme.typography.size.l1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  paddingTop: 4,
  paddingBottom: 16,
  marginBottom: 16,
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

export function DeboSection({ dataPath, parser, command, emptyMessage, renderContent, title, filePath, bare = false }) {
  const { data, loading, error, reload } = useDesignbookData(dataPath, parser);
  const displayPath = filePath || `designbook/${dataPath}`;

  const heading = title ? <SectionHeading>{title}</SectionHeading> : null;

  if (loading) return <>{heading}<DeboLoading /></>;

  if (error) {
    return (
      <>
        {heading}
        <DeboAlert type="error">Failed to load data: {error}</DeboAlert>
      </>
    );
  }

  if (!data) {
    const empty = (
      <>
        {heading}
        <DeboEmptyState message={emptyMessage} command={command} filePath={displayPath} />
      </>
    );
    return bare ? empty : <DeboPageLayout gap="8">{empty}</DeboPageLayout>;
  }

  if (bare) {
    return <>{heading}{renderContent(data)}</>;
  }

  return (
    <DeboPageLayout>
      {heading}
      {renderContent(data)}
      <DeboSourceFooter path={displayPath} command={command} onReload={reload} />
    </DeboPageLayout>
  );
}
