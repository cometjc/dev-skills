'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {resolveDispatchMode} = require('../pld-tool-lib.cjs');

test('resolveDispatchMode defaults to streaming when async capability exists', () => {
  const prevSupports = process.env.PLD_SUPPORTS_ASYNC_DISPATCH;
  const prevMode = process.env.PLD_DISPATCH_MODE;
  try {
    delete process.env.PLD_SUPPORTS_ASYNC_DISPATCH;
    delete process.env.PLD_DISPATCH_MODE;
    const resolved = resolveDispatchMode();
    assert.equal(resolved.mode, 'streaming');
    assert.equal(resolved.requested, 'auto');
  } finally {
    if (prevSupports === undefined) delete process.env.PLD_SUPPORTS_ASYNC_DISPATCH;
    else process.env.PLD_SUPPORTS_ASYNC_DISPATCH = prevSupports;
    if (prevMode === undefined) delete process.env.PLD_DISPATCH_MODE;
    else process.env.PLD_DISPATCH_MODE = prevMode;
  }
});

test('resolveDispatchMode auto degrades to wave when async capability is disabled', () => {
  const prevSupports = process.env.PLD_SUPPORTS_ASYNC_DISPATCH;
  const prevMode = process.env.PLD_DISPATCH_MODE;
  try {
    process.env.PLD_SUPPORTS_ASYNC_DISPATCH = 'false';
    delete process.env.PLD_DISPATCH_MODE;
    const resolved = resolveDispatchMode();
    assert.equal(resolved.mode, 'wave');
    assert.equal(resolved.source, 'auto-capability');
  } finally {
    if (prevSupports === undefined) delete process.env.PLD_SUPPORTS_ASYNC_DISPATCH;
    else process.env.PLD_SUPPORTS_ASYNC_DISPATCH = prevSupports;
    if (prevMode === undefined) delete process.env.PLD_DISPATCH_MODE;
    else process.env.PLD_DISPATCH_MODE = prevMode;
  }
});

test('resolveDispatchMode respects explicit dispatch mode override', () => {
  const resolved = resolveDispatchMode('wave');
  assert.equal(resolved.mode, 'wave');
  assert.equal(resolved.source, 'explicit');
});
