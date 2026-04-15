'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  PldToolError,
  validateCanonicalResultStatus,
  validateReportResultPayload,
  validateReportResultTransition,
} = require('../pld-tool-lib.cjs');

test('rejects unknown status (legacy spec_pass)', () => {
  assert.throws(
    () => validateCanonicalResultStatus('spec_pass'),
    (err) => err instanceof PldToolError && err.code === 'E_STATUS_INVALID',
  );
});

test('rejects empty status', () => {
  assert.throws(
    () => validateCanonicalResultStatus(''),
    (err) => err instanceof PldToolError && err.code === 'E_FIELD_REQUIRED',
  );
});

test('accepts READY_TO_COMMIT with trimming', () => {
  assert.strictEqual(validateCanonicalResultStatus('  READY_TO_COMMIT  '), 'READY_TO_COMMIT');
});

test('rejects legacy payload keys on report-result payload', () => {
  assert.throws(
    () => validateReportResultPayload({verificationSummary: 'ok', specPass: true}),
    (err) => err instanceof PldToolError && err.code === 'E_PAYLOAD_INVALID',
  );
});

test('allows payload with only verificationSummary', () => {
  const out = validateReportResultPayload({verificationSummary: 'tests passed'});
  assert.deepStrictEqual(out, {verificationSummary: 'tests passed'});
});

test('report-result transition blocks DONE from implementing', () => {
  assert.throws(
    () => validateReportResultTransition('implementing', 'DONE'),
    (err) => err instanceof PldToolError && err.code === 'E_TRANSITION_INVALID',
  );
});

test('allows READY_TO_COMMIT from queued', () => {
  validateReportResultTransition('queued', 'READY_TO_COMMIT');
});

test('review-pending allows DONE', () => {
  validateReportResultTransition('review-pending', 'DONE');
});

test('review-pending rejects READY_TO_COMMIT', () => {
  assert.throws(
    () => validateReportResultTransition('review-pending', 'READY_TO_COMMIT'),
    (err) => err instanceof PldToolError && err.code === 'E_TRANSITION_INVALID',
  );
});

test('coordinator-commit-pending allows READY_FOR_REVIEW', () => {
  validateReportResultTransition('coordinator-commit-pending', 'READY_FOR_REVIEW');
});

test('terminal done phase rejects any new status', () => {
  assert.throws(
    () => validateReportResultTransition('done', 'RUNNING'),
    (err) => err instanceof PldToolError && err.code === 'E_TRANSITION_INVALID',
  );
});
