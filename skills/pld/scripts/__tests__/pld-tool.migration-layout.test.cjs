'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {strict: assert} = require('node:assert');
const {test} = require('node:test');
const {importLegacyExecutionState} = require('../pld-tool-lib.cjs');

const lanePlanFixture = `# Lane 1

PLD worktree: \`legacy/wt\`

> Ownership family:
> \`skills/pld/scripts/\`

> Lane-local verification:
> \`node --version\`

## Tasks

- [ ] Migration placeholder
`;

test('legacy PLD/executions layout is migrated to docs/plans on import', () => {
  const prevRoot = process.env.PLD_PROJECT_ROOT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pld-layout-migrate-'));
  try {
    process.env.PLD_PROJECT_ROOT = tmp;
    const legacyDir = path.join(tmp, 'PLD', 'executions', 'legacy-exec');
    fs.mkdirSync(legacyDir, {recursive: true});
    fs.writeFileSync(path.join(legacyDir, 'lane-1.md'), lanePlanFixture, 'utf8');

    const result = importLegacyExecutionState(tmp);
    assert.equal(result.migratedExecutionCount, 1);
    assert.equal(result.migratedLaneCount, 1);

    const migratedPath = path.join(tmp, 'docs', 'plans', 'legacy-exec', 'run-migrated-lane-1.md');
    assert.equal(fs.existsSync(migratedPath), true);
    assert.equal(fs.existsSync(path.join(legacyDir, 'lane-1.md')), false);
  } finally {
    if (prevRoot === undefined) {
      delete process.env.PLD_PROJECT_ROOT;
    } else {
      process.env.PLD_PROJECT_ROOT = prevRoot;
    }
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});
