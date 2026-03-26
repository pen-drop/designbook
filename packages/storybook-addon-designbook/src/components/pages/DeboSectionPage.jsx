import React, { useState, useCallback } from 'react';
import { styled } from 'storybook/theming';
import { DeboSection } from '../DeboSection.jsx';
import { DeboTabs } from '../ui/DeboTabs.jsx';

import { DeboProse } from '../ui/DeboTypography.jsx';
import { DeboSampleData } from '../display/DeboSampleData.jsx';
import { DeboSceneGrid } from '../display/DeboSceneGrid.jsx';
import { parseScreenshots } from '../parsers.js';
import { load as parseYaml } from 'js-yaml';
import { DeboCollapsible, DeboGrid } from '../ui/index.js';

const yamlParser = (text) => {
  try { return parseYaml(text); } catch { return null; }
};

const scenesParser = (text) => {
  try {
    const data = parseYaml(text);
    return data?.scenes?.length ? data : null;
  } catch { return null; }
};

const screenshotsParser = (md) => {
  const items = parseScreenshots(md);
  return items.length > 0 ? items : null;
};

const ContentCard = styled.div(({ theme }) => ({
  background: theme.background?.content || '#ffffff',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 12,
  overflow: 'hidden',
}));

const CardContent = styled.div({
  padding: '32px 16px',
});


const ScreenshotCard = styled.div(({ theme }) => ({
  borderRadius: 8,
  border: `1px solid ${theme.appBorderColor}`,
  overflow: 'hidden',
}));

const ScreenshotImage = styled.img({
  width: '100%',
  height: 'auto',
  display: 'block',
});

const ScreenshotCaption = styled.p(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  padding: 8,
  textAlign: 'center',
  margin: 0,
}));

const TabContent = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '16px 0',
});

export function DeboSectionPage({ sectionId, title }) {
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <div key={reloadKey}>
      <DeboTabs
        tabs={[
          {
            id: 'spec',
            title: 'Spec',
            children: () => (
              <TabContent>
                <DeboSection
                  title="Shape Section"
                  dataPath={`sections/${sectionId}/${sectionId}.section.scenes.yml`}
                  parser={yamlParser}
                  command={`/debo shape-section ${sectionId}`}
                  emptyMessage={`No specification for ${title} yet`}
                  filePath={`designbook/sections/${sectionId}/${sectionId}.section.scenes.yml`}
                  renderContent={(data) => (
                    <DeboGrid gap="lg">
                      <DeboCollapsible title={'Description'} defaultOpen={true}>
                        <DeboProse content={data.description} />
                      </DeboCollapsible>
                      {data.user_flows && (
                        <DeboCollapsible title={'User Flows'}>
                          <DeboProse content={data.user_flows} />
                        </DeboCollapsible>
                      )}
                      {data.ui_requirements && (
                        <DeboCollapsible title={'UI Requirements'}>
                          <DeboProse content={data.ui_requirements} />
                        </DeboCollapsible>
                      )}
                    </DeboGrid>
                  )}
                />
              </TabContent>
            ),
          },
          {
            id: 'data',
            title: 'Sample Data',
            children: () => (
              <TabContent>
                <DeboSection
                  title="Sample Data"
                  dataPath={`sections/${sectionId}/data.yml`}
                  parser={yamlParser}
                  command={`/debo sample-data ${sectionId}`}
                  emptyMessage="No sample data defined yet"
                  filePath={`designbook/sections/${sectionId}/data.yml`}
                  renderContent={(data) => <DeboSampleData data={data} />}
                />
              </TabContent>
            ),
          },
          {
            id: 'design',
            title: 'Design',
            children: () => (
              <TabContent>
                <DeboSection
                  title="Design"
                  dataPath={`sections/${sectionId}/${sectionId}.section.scenes.yml`}
                  parser={scenesParser}
                  command={`/debo design-screen ${sectionId}`}
                  emptyMessage="No designs yet"
                  filePath={`designbook/sections/${sectionId}/${sectionId}.section.scenes.yml`}
                  renderContent={(data) => <DeboSceneGrid data={data} />}
                />
              </TabContent>
            ),
          },
          {
            id: 'screenshots',
            title: 'Screenshots',
            children: () => (
              <TabContent>
                <DeboSection
                  title="Screenshots"
                  dataPath={`sections/${sectionId}/screenshots.md`}
                  parser={screenshotsParser}
                  command={`/debo screenshot-design ${sectionId}`}
                  emptyMessage="No screenshots captured yet"
                  filePath={`designbook/sections/${sectionId}/`}
                  renderContent={(shots) => (
                    <DeboGrid variant="auto" gap="md" minWidth={300}>
                      {shots.map((shot, index) => (
                        <ScreenshotCard key={index}>
                          <ScreenshotImage
                            src={`/__designbook/load?path=sections/${sectionId}/${shot.path}`}
                            alt={shot.alt}
                          />
                          <ScreenshotCaption>{shot.alt}</ScreenshotCaption>
                        </ScreenshotCard>
                      ))}
                    </DeboGrid>
                  )}
                />
              </TabContent>
            ),
          },
        ]}
      />
    </div>

  );
}
