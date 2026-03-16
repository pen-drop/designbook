import React from 'react';
import { TabsView } from 'storybook/internal/components';
import { DeboSection } from '../DeboSection.jsx';
import { DeboDesignTokens } from '../display/DeboDesignTokens.jsx';
import { DeboProse } from '../ui/DeboTypography.jsx';
import { DeboSceneGrid } from '../display/DeboSceneGrid.jsx';
import { parse as parseYaml } from 'yaml';

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
      parser={(content) => scenesParser(content)}
      command="/debo-design-shell"
      emptyMessage="No shell design defined yet"
      filePath="designbook/design-system/design-system.scenes.yml"
      renderContent={(data) => {
        const description = data.description || '';
        return (
          <>
            <DeboProse content={description} />
            <DeboSceneGrid data={data} />
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
