import React from 'react';
import { TabsView } from 'storybook/internal/components';
import { DeboProductOverview } from '../display/DeboProductOverview.jsx';
import { DeboSection } from '../DeboSection.jsx';
import { DeboDataModel } from '../display/DeboDataModel.jsx';
import { parse as parseYaml } from 'yaml';

export function DeboFoundationPage() {
  return (
    <TabsView
      defaultSelected="vision"
      tabs={[
        {
          id: 'vision',
          title: 'Vision',
          children: () => <DeboProductOverview />,
        },
        {
          id: 'data-model',
          title: 'Data Model',
          children: () => (
            <DeboSection
              title="Data Model"
              dataPath="data-model.yml"
              parser={(content) => parseYaml(content)}
              command="/debo-data-model"
              emptyMessage="No data model defined yet"
              renderContent={(data) => <DeboDataModel data={data} />}
            />
          ),
        },
      ]}
    />
  );
}
