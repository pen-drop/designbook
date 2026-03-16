import React from 'react';
import { TabsView } from 'storybook/internal/components';
import { styled } from 'storybook/theming';
import { DeboSection } from '../DeboSection.jsx';
import { DeboDesignTokens } from '../display/DeboDesignTokens.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboSceneGrid } from '../display/DeboSceneGrid.jsx';
import { parseMarkdown } from '../parsers.js';
import { parse as parseYaml } from 'yaml';

const Prose = styled.div(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s2,
  lineHeight: 1.6,
  color: theme.color.defaultText,
  '& h1, & h2, & h3, & h4': { fontWeight: 400, marginTop: '1em', marginBottom: '0.5em' },
  '& p': { marginTop: '0.5em', marginBottom: '0.5em' },
  '& ul, & ol': { paddingLeft: '1.5em' },
  '& a': { color: '#3B82F6', textDecoration: 'underline' },
}));

const scenesParser = (text) => {
  try {
    const data = parseYaml(text);
    return data?.scenes?.length ? data : null;
  } catch { return null; }
};

function TokensTab() {
  return (
    <DeboSection
      title="Design Tokens"
      dataPath="design-system/design-tokens.yml"
      parser={(content) => parseYaml(content)}
      command="/debo-design-tokens"
      emptyMessage="No design tokens defined yet"
      renderContent={(data) => <DeboDesignTokens tokens={data} />}
    />
  );
}

function ShellTab() {
  return (
    <DeboSection
      title="Shell Design"
      dataPath="design-system/design-system.scenes.yml"
      parser={(content) => parseYaml(content)}
      command="/debo-design-shell"
      emptyMessage="No shell design defined yet"
      filePath="designbook/design-system/design-system.scenes.yml"
      renderContent={(data) => {
        const description = data.description || '';
        return (
          <>
            {description && (
              <DeboCollapsible title="Description" defaultOpen={true}>
                <Prose dangerouslySetInnerHTML={{ __html: parseMarkdown(description) }} />
              </DeboCollapsible>
            )}
            <DeboSection
              title="Scenes"
              dataPath="design-system/design-system.scenes.yml"
              parser={scenesParser}
              command="/debo-design-shell"
              emptyMessage="No scenes yet"
              filePath="designbook/design-system/design-system.scenes.yml"
              renderContent={(scenesData) => <DeboSceneGrid data={scenesData} />}
            />
          </>
        );
      }}
    />
  );
}

export function DeboDesignSystemPage() {
  return (
    <TabsView
      defaultSelected="tokens"
      tabs={[
        { id: 'tokens', title: 'Tokens', children: () => <TokensTab /> },
        { id: 'shell', title: 'Shell', children: () => <ShellTab /> },
      ]}
    />
  );
}
