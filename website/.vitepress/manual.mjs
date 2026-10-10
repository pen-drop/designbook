export const SRC_EXCLUDE = [
  'specs/**',
  'spikes/**',
  'experiments/**',
  'gaia/**',
  'superpowers/**',
]

export const AREAS = [
  { label: 'Get started', link: '/get-started/', icon: 'start' },
  { label: 'Extend Designbook', link: '/extend/', icon: 'extend' },
  { label: 'Integrations', link: '/integrations/', icon: 'plug' },
  { label: 'Advanced', link: '/advanced/', icon: 'gear' },
]

export const LANDINGS = [
  { id: 'drupal', label: 'Drupal', link: '/drupal/', status: 'ready', integration: '/integrations/drupal' },
]

const group = (text, items) => ({ text, items: items.map(([label, link]) => ({ text: label, link })) })

export const SIDEBAR = {
  '/manual': [group('Documentation', AREAS.map((area) => [area.label, area.link]))],
  '/get-started/': [
    group('Get started', [
      ['Overview', '/get-started/'],
      ['What Designbook is', '/get-started/what-is-designbook'],
      ['Install the skills', '/get-started/install'],
      ['Initialize a project', '/get-started/first-project'],
      ['Run one workflow', '/get-started/first-workflow'],
      ['Skills and workflows', '/get-started/skills-and-workflows'],
      ['The pipeline', '/get-started/pipeline'],
      ['Preview in Storybook', '/get-started/preview'],
      ['Troubleshooting', '/get-started/troubleshooting'],
    ]),
  ],
  '/extend/': [
    group('Extend Designbook', [
      ['Overview', '/extend/'],
      ['How extensions work', '/extend/how-extensions-work'],
      ['Project configuration', '/extend/configuration'],
      ['Add an extension', '/extend/add-an-extension'],
      ['Extend a skill', '/extend/extend-a-skill'],
      ['Workflows and stages', '/extend/workflows-and-stages'],
      ['Test an extension', '/extend/test-an-extension'],
    ]),
  ],
  '/integrations/': [
    group('Integrations', [
      ['Overview', '/integrations/'],
      ['Drupal', '/integrations/drupal'],
      ['First Drupal result', '/integrations/drupal/first-result'],
      ['Tailwind CSS', '/integrations/tailwind'],
      ['Google Stitch', '/integrations/stitch'],
      ['Figma', '/integrations/figma'],
      ['GAIA', '/integrations/gaia'],
    ]),
  ],
  '/advanced/': [
    group('Advanced', [['Overview', '/advanced/']]),
    group('CLI', [
      ['CLI overview', '/advanced/cli/'],
      ['config', '/advanced/cli/config'],
      ['validate', '/advanced/cli/validate'],
      ['guard-css', '/advanced/cli/guard-css'],
      ['intake', '/advanced/cli/intake'],
      ['plan', '/advanced/cli/plan'],
      ['storybook', '/advanced/cli/storybook'],
      ['verify', '/advanced/cli/verify'],
      ['compare-images', '/advanced/cli/compare-images'],
      ['reference', '/advanced/cli/reference'],
      ['capture', '/advanced/cli/capture'],
    ]),
    group('Development', [
      ['Development overview', '/advanced/development/'],
      ['Build from source', '/advanced/development/build-from-source'],
      ['Checks', '/advanced/development/checks'],
      ['Test workspaces', '/advanced/development/test-workspaces'],
      ['Skill creator', '/advanced/development/skill-creator'],
      ['Architecture', '/advanced/development/architecture'],
      ['Write the docs', '/advanced/development/write-docs'],
    ]),
  ],
}
