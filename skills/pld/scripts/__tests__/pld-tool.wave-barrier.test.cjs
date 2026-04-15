'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {strict: assert} = require('node:assert');
const {test} = require('node:test');
const {ensureExecutorDb, buildCoordinatorLoopFromExecutor} = require('../pld-tool-lib.cjs');

function seedLane(projectRoot, execution, lane, phase, currentItem = 'x') {
  const dbPath = path.join(projectRoot, '.pld', 'executor.sqlite');
  const sql = [
    `insert or ignore into executions (execution_name, imported_at) values ('${execution}', datetime('now'));`,
    `insert or replace into lanes (execution_name, lane_name, current_item, phase, last_verification, lane_branch, base_branch)
     values ('${execution}', '${lane}', '${currentItem}', '${phase}', '[]', 'pld/${execution}/${lane}', 'main');`,
  ].join('\n');
  require('node:child_process').execFileSync('sqlite3', [dbPath, sql], {encoding: 'utf8'});
}

test('wave mode waits at barrier when an implementing lane exists', () => {
  const prevRoot = process.env.PLD_PROJECT_ROOT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pld-wave-barrier-'));
  try {
    process.env.PLD_PROJECT_ROOT = tmp;
    ensureExecutorDb(tmp);
    const execution = 'wave-exec';
    seedLane(tmp, execution, 'Lane 1', 'implementing');
    seedLane(tmp, execution, 'Lane 2', 'queued');

    const coordinator = buildCoordinatorLoopFromExecutor(tmp, execution, 4, false, {dispatchMode: 'wave'});
    assert.equal(coordinator.dispatchMode, 'wave');
    assert.equal(coordinator.schedulerBarrier, 'wave_waiting');
    assert.equal(coordinator.launch.assignments.length, 0);
    assert.equal(coordinator.noDispatchReason, 'wave-barrier-waiting');
  } finally {
    if (prevRoot === undefined) delete process.env.PLD_PROJECT_ROOT;
    else process.env.PLD_PROJECT_ROOT = prevRoot;
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});

test('streaming mode can dispatch queued lane while another lane implements', () => {
  const prevRoot = process.env.PLD_PROJECT_ROOT;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pld-streaming-'));
  try {
    process.env.PLD_PROJECT_ROOT = tmp;
    ensureExecutorDb(tmp);
    const execution = 'stream-exec';
    seedLane(tmp, execution, 'Lane 1', 'implementing');
    seedLane(tmp, execution, 'Lane 2', 'queued');

    const coordinator = buildCoordinatorLoopFromExecutor(tmp, execution, 4, false, {dispatchMode: 'streaming'});
    assert.equal(coordinator.dispatchMode, 'streaming');
    assert.equal(coordinator.schedulerBarrier, 'none');
    assert.equal(coordinator.launch.assignments.length, 1);
    assert.equal(coordinator.launch.assignments[0].lane, 'Lane 2');
  } finally {
    if (prevRoot === undefined) delete process.env.PLD_PROJECT_ROOT;
    else process.env.PLD_PROJECT_ROOT = prevRoot;
    fs.rmSync(tmp, {recursive: true, force: true});
  }
});
