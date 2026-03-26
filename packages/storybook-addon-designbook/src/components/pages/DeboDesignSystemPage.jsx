import React from 'react';
import { DeboSection } from '../DeboSection.jsx';
import { DeboDesignTokens } from '../display/DeboDesignTokens.jsx';
import { DeboDesignGuidelines } from '../display/DeboDesignGuidelines.jsx';
import { DeboProse } from '../ui/DeboTypography.jsx';
import { DeboSceneGrid } from '../display/DeboSceneGrid.jsx';
import { load as parseYaml } from 'js-yaml';
import { DeboTabs } from '../ui/DeboTabs.jsx';

const scenesParser = (text) => {
  try {
    const data = parseYaml(text);
    return data?.scenes?.length ? data : null;
  } catch { return null; }
};

function GuidelinesTab() {
  return (
    <DeboSection
      title="Design Guidelines"
      dataPath="design-system/guidelines.yml"
      parser={(content) => parseYaml(content)}
      command="/debo design-guideline"
      emptyMessage="No design guidelines defined yet"
      renderContent={(data) => <DeboDesignGuidelines data={data} />}
    />
  );
}

function TokensTab() {
  return (
    <DeboSection
      title="Design Tokens"
      dataPath="design-system/design-tokens.yml"
      parser={(content) => parseYaml(content)}
      command="/debo design-tokens"
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
      command="/debo design-shell"
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
    <DeboTabs
      tabs={[
        { id: 'guidelines', title: 'Guidelines', children: () => <GuidelinesTab /> },
        { id: 'tokens', title: 'Tokens', children: () => <TokensTab /> },
        { id: 'shell', title: 'Shell', children: () => <ShellTab /> },
      ]}
    />
  );
}
