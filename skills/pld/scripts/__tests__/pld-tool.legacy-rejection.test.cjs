'use strict';

const {strict: assert} = require('node:assert');
const {test} = require('node:test');
const {validateReportResultStatus} = require('../pld-tool-lib.cjs');

test('validateReportResultStatus rejects legacy spec_pass alias with E_STATUS_INVALID', () => {
  assert.throws(
    () => validateReportResultStatus('spec_pass'),
    /E_STATUS_INVALID/,
  );
});

test('validateReportResultStatus rejects legacy quality_pass alias with E_STATUS_INVALID', () => {
  assert.throws(
    () => validateReportResultStatus('quality_pass'),
    /E_STATUS_INVALID/,
  );
});

test('validateReportResultStatus rejects lowercase drift', () => {
  assert.throws(
    () => validateReportResultStatus('ready_to_commit'),
    /E_STATUS_INVALID/,
  );
});

test('validateReportResultStatus rejects review-outcome PASS token as status', () => {
  assert.throws(
    () => validateReportResultStatus('PASS'),
    /E_STATUS_INVALID/,
  );
});

test('validateReportResultStatus accepts READY_TO_COMMIT', () => {
  assert.doesNotThrow(() => validateReportResultStatus('READY_TO_COMMIT'));
});
