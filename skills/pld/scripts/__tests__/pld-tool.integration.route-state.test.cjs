'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {strict: assert} = require('node:assert');
const {test} = require('node:test');
const {
  importLegacyExecutionState,
  claimAssignment,
  reportResult,
  listLanes,
} = require('../pld-tool-lib.cjs');

const lanePlanFixture = `# Lane 1

PLD worktree: \`route-it/wt\`

> Ownership family:
> \`skills/pld/scripts/__tests__/\`

> Lane-local verification:
> \`node --version\`

## Tasks

- [ ] Integration placeholder
`;

test('route-state integration: import → claim → READY_TO_COMMIT updates executor lane', () => {
  const prevRoot = process.env.PLD_PROJECT_ROOT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pld-route-state-'));
  try {
    process.env.PLD_PROJECT_ROOT = tmp;
    const pldRoot = path.join(tmp, 'PLD');
    const execDir = path.join(pldRoot, 'executions', 'route-state-exec');
    fs.mkdirSync(execDir, {recursive: true});
    fs.writeFileSync(path.join(execDir, 'lane-1.md'), lanePlanFixture, 'utf8');

    importLegacyExecutionState(tmp);
    const claimed = claimAssignment(tmp, 'route-state-exec', 'Lane 1');
    assert.equal(claimed.execution, 'route-state-exec');
    assert.equal(claimed.lane, 'Lane 1');

    reportResult(tmp, 'route-state-exec', 'Lane 1', 'READY_TO_COMMIT', 'pld/route-state-exec/lane-1', {
      verificationSummary: 'lane checks passed',
    });

    const lanes = listLanes(tmp, 'route-state-exec');
    const lane1 = lanes.find((entry) => entry.laneName === 'Lane 1');
    assert.ok(lane1);
    assert.equal(lane1.phase, 'coordinator-commit-pending');
    assert.equal(lane1.resultStatus, 'READY_TO_COMMIT');
  } finally {
    if (prevRoot === undefined) {
      delete process.env.PLD_PROJECT_ROOT;
    } else {
      process.env.PLD_PROJECT_ROOT = prevRoot;
    }
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});
