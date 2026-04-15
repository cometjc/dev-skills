'use strict';

const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const path = require('node:path');
const test = require('node:test');

const tool = path.join(__dirname, '..', 'pld-tool.cjs');
/** Repo root: parent of `skills/` (worktree contains `skills/pld/scripts/__tests__`). */
const repoRoot = path.join(__dirname, '..', '..', '..', '..');

function runTool(argv) {
  return spawnSync(process.execPath, [tool, ...argv], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('reviewer claim-assignment exits 3 with E_ROLE_ACL_DENIED', () => {
  const res = runTool([
    '--role',
    'reviewer',
    'claim-assignment',
    '--execution',
    'do-pld-strict-canonical',
    '--lane',
    'Lane 3',
  ]);
  assert.strictEqual(res.status, 3, res.stderr || res.stdout);
  const err = JSON.parse(res.stderr.trim());
  assert.strictEqual(err.code, 'E_ROLE_ACL_DENIED');
  assert.ok(Array.isArray(err.expected));
});

test('worker import-plans exits 3 with ACL structured error', () => {
  const res = runTool(['--role', 'worker', 'import-plans', '--json']);
  assert.strictEqual(res.status, 3);
  const err = JSON.parse(res.stderr.trim());
  assert.strictEqual(err.code, 'E_ROLE_ACL_DENIED');
});

test('legacy coder role alias exits 2 with E_ROLE_ALIAS_REJECTED', () => {
  const res = runTool(['--role', 'coder', 'audit']);
  assert.strictEqual(res.status, 2);
  const err = JSON.parse(res.stderr.trim());
  assert.strictEqual(err.code, 'E_ROLE_ALIAS_REJECTED');
});

test('unknown lane on claim-assignment exits 4 with E_LANE_UNKNOWN', () => {
  const res = runTool([
    '--role',
    'worker',
    'claim-assignment',
    '--execution',
    'nonexistent-execution-id',
    '--lane',
    'Lane 1',
  ]);
  assert.strictEqual(res.status, 4);
  const err = JSON.parse(res.stderr.trim());
  assert.strictEqual(err.code, 'E_LANE_UNKNOWN');
});

test('invalid report-result status exits 2 with E_STATUS_INVALID', () => {
  const res = runTool([
    '--role',
    'worker',
    'report-result',
    '--execution',
    'do-pld-strict-canonical',
    '--lane',
    'Lane 3',
    '--status',
    'spec_pass',
    '--result-branch',
    'pld/test',
  ]);
  assert.strictEqual(res.status, 2);
  const err = JSON.parse(res.stderr.trim());
  assert.strictEqual(err.code, 'E_STATUS_INVALID');
});

test('unknown command exits 2 with E_COMMAND_UNKNOWN', () => {
  const res = runTool(['--role', 'worker', 'not-a-real-command']);
  assert.strictEqual(res.status, 2);
  const err = JSON.parse(res.stderr.trim());
  assert.strictEqual(err.code, 'E_COMMAND_UNKNOWN');
});
