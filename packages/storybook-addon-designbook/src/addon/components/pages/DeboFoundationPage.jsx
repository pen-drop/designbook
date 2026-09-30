import React, { useRef, useState } from 'react';
import { DeboProductOverview } from '../display/DeboProductOverview.jsx';
import { DeboSection } from '../DeboSection.jsx';
import { DeboDataModel, resetDataModelLayout } from '../display/DeboDataModel.jsx';
import { load as parseYaml } from 'js-yaml';
import { useUrlState } from '../../hooks/useUrlState.js';
import { DeboTabs } from '../ui/DeboTabs.jsx';

export function DeboFoundationPage() {
  const [entity, setEntity] = useUrlState('debo-entity', null);
  // Held here: the tab content remounts whenever this page re-renders.
  const [dataModelView, setDataModelView] = useState('cards');
  // Filter, layout and graph focus; a ref so graph interaction never re-renders (and remounts) the tabs.
  const dataModelSession = useRef(null);

  return (
    <DeboTabs
      onSelectionChange={(id) => {
        if (id !== 'data-model') setEntity(null);
      }}
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
              onReload={() => resetDataModelLayout(dataModelSession)}
              command="/debo data-model"
              emptyMessage="No data model defined yet"
              renderContent={(data) => (
                <DeboDataModel
                  data={data}
                  selectedEntity={entity}
                  onSelectEntity={setEntity}
                  view={dataModelView}
                  onViewChange={setDataModelView}
                  session={dataModelSession}
                />
              )}
            />
          ),
        },
      ]}
    />
  );
}
