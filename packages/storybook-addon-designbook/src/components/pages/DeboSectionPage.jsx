import React, { useState, useCallback } from 'react';
import { styled } from 'storybook/theming';
import { DeboSection } from '../DeboSection.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from '../ui/DeboSourceFooter.jsx';
import { DeboSampleData } from '../display/DeboSampleData.jsx';
import { DeboSceneGrid } from '../display/DeboSceneGrid.jsx';
import { parseMarkdown, parseScreenshots } from '../parsers.js';
import { parse as parseYaml } from 'yaml';

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

const PageTitle = styled.h1(({ theme }) => ({
  fontSize: 24,
  fontWeight: 600,
  color: theme.color.defaultText,
  margin: 0,
}));

const ContentCard = styled.div(({ theme }) => ({
  background: theme.background?.content || '#ffffff',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 12,
  overflow: 'hidden',
}));

const CardContent = styled.div({
  padding: '32px 16px',
});

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

const ScreenshotGrid = styled.div({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 16,
  marginTop: 8,
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

export function DeboSectionPage({ sectionId, title }) {
  const [reloadKey, setReloadKey] = useState(0);
  const handleReload = useCallback(() => setReloadKey(k => k + 1), []);

  return (
    <DeboPageLayout key={reloadKey} gap="8">
      <PageTitle>{title}</PageTitle>

      <DeboSection
        title="Shape Section"
        dataPath={`sections/${sectionId}/${sectionId}.section.scenes.yml`}
        parser={parseMarkdown}
        command={`/debo-shape-section ${sectionId}`}
        emptyMessage={`No specification for ${title} yet`}
        filePath={`designbook/sections/${sectionId}/${sectionId}.section.scenes.yml`}
        renderContent={(html) => (
          <ContentCard>
            <CardContent>
              <Prose dangerouslySetInnerHTML={{ __html: html }} />
            </CardContent>
          </ContentCard>
        )}
      />

      <DeboSection
        title="Sample Data"
        dataPath={`sections/${sectionId}/data.yml`}
        parser={yamlParser}
        command={`/debo-sample-data ${sectionId}`}
        emptyMessage="No sample data defined yet"
        filePath={`designbook/sections/${sectionId}/data.yml`}
        renderContent={(data) => <DeboSampleData data={data} />}
      />

      <DeboSection
        title="Design"
        dataPath={`sections/${sectionId}/${sectionId}.section.scenes.yml`}
        parser={scenesParser}
        command={`/debo-design-screen ${sectionId}`}
        emptyMessage="No designs yet"
        filePath={`designbook/sections/${sectionId}/${sectionId}.section.scenes.yml`}
        renderContent={(data) => <DeboSceneGrid data={data} />}
      />

      <DeboSection
        title="Screenshots"
        dataPath={`sections/${sectionId}/screenshots.md`}
        parser={screenshotsParser}
        command={`/debo-screenshot-design ${sectionId}`}
        emptyMessage="No screenshots captured yet"
        filePath={`designbook/sections/${sectionId}/`}
        renderContent={(shots) => (
          <ScreenshotGrid>
            {shots.map((shot, index) => (
              <ScreenshotCard key={index}>
                <ScreenshotImage
                  src={`/__designbook/load?path=sections/${sectionId}/${shot.path}`}
                  alt={shot.alt}
                />
                <ScreenshotCaption>{shot.alt}</ScreenshotCaption>
              </ScreenshotCard>
            ))}
          </ScreenshotGrid>
        )}
      />

      <DeboSourceFooter path={`designbook/sections/${sectionId}/`} onReload={handleReload} />
    </DeboPageLayout>
  );
}
