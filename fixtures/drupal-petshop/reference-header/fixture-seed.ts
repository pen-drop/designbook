// Seeds one published, screenshot-approved role-reference revision (website header)
// into the workspace's designbook data dir. Run by scripts/setup-test.sh.
import { captureFixture } from '../../../packages/storybook-addon-designbook/src/__tests__/capture-fixture';
import { writeApproval } from '../../../packages/storybook-addon-designbook/src/tools/reference-approval';

const data = process.argv[2];
if (!data) throw new Error('usage: fixture-seed.ts <designbook data dir>');
const reference = captureFixture(data, 'website', 'capture-one');
await reference.complete();
writeApproval(reference.folder, {
  status: 'approved',
  scope: { subjects: ['header'], states: ['rest', 'open'], views: ['mobile', 'desktop'] },
});
console.log(`  Published reference ${reference.location.id}/${reference.location.revision}`);
