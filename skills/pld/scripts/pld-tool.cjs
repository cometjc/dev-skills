#!/usr/bin/env node

const {
  auditExecutor,
  claimAssignment,
  createPldToolError,
  exitCodeForPldError,
  goExecutor,
  importLegacyExecutionState,
  importPlanFiles,
  reportResult,
  structuredErrorShape,
} = require('./pld-tool-lib.cjs');
const {resolveProjectRoot} = require('./pld-lib.cjs');

const KNOWN_COMMANDS = ['import-plans', 'audit', 'go', 'claim-assignment', 'report-result'];
const KNOWN_COMMAND_SET = new Set(KNOWN_COMMANDS);

/** Subcommands each role may run (ACL). Default role is worker when unset (fail-closed vs coordinator). */
const WORKER_LIKE_COMMANDS = new Set(['audit', 'claim-assignment', 'report-result']);
const ROLE_COMMANDS = {
  coordinator: new Set(['import-plans', 'audit', 'go', 'claim-assignment', 'report-result']),
  worker: WORKER_LIKE_COMMANDS,
  reviewer: new Set(['audit', 'report-result']),
};

function resolveRole(args) {
  const raw = (args.role || process.env.PLD_ROLE || 'worker').trim().toLowerCase();
  if (raw === 'coder') {
    throw createPldToolError({
      code: 'E_ROLE_ALIAS_REJECTED',
      message: 'Role alias "coder" is no longer accepted.',
      expected: ['worker', 'coordinator', 'reviewer'],
      received: 'coder',
      hint: 'Use --role worker (same ACL as the former coder role).',
      category: 'contract',
    });
  }
  if (!ROLE_COMMANDS[raw]) {
    throw createPldToolError({
      code: 'E_ROLE_INVALID',
      message: `Invalid role "${raw}".`,
      expected: ['coordinator', 'worker', 'reviewer'],
      received: raw,
      hint: 'Use --role <coordinator|worker|reviewer> or PLD_ROLE (same values).',
      category: 'contract',
    });
  }
  return raw;
}

function assertCommandAllowed(role, command) {
  if (!command) {
    return;
  }
  const allowed = ROLE_COMMANDS[role];
  if (!allowed.has(command)) {
    throw createPldToolError({
      code: 'E_ROLE_ACL_DENIED',
      message: `Role "${role}" is not allowed to run "${command}".`,
      expected: [...allowed].sort(),
      received: command,
      hint: 'Use --role coordinator for import-plans and go, or switch to a permitted role.',
      category: 'acl',
    });
  }
}

function parseArgs(argv) {
  const args = {
    cleanup: false,
    json: false,
  };
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--project-root') {
      args.projectRoot = argv[index + 1];
      index += 1;
    } else if (value === '--role') {
      args.role = argv[index + 1];
      index += 1;
    } else if (value === '--cleanup') {
      args.cleanup = true;
    } else if (value === '--json') {
      args.json = true;
    } else if (value === '--execution') {
      args.execution = argv[index + 1];
      index += 1;
    } else if (value === '--lane') {
      args.lane = argv[index + 1];
      index += 1;
    } else if (value === '--status') {
      args.status = argv[index + 1];
      index += 1;
    } else if (value === '--result-branch') {
      args.resultBranch = argv[index + 1];
      index += 1;
    } else if (value === '--verification-summary') {
      args.verificationSummary = argv[index + 1];
      index += 1;
    } else {
      positionals.push(value);
    }
  }

  return {
    ...args,
    command: positionals[0] || null,
  };
}

function printResult(result, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

function usage() {
  return [
    'Usage: node skills/pld/scripts/pld-tool.cjs <command> [options]',
    '',
    'Global:',
    '  --role coordinator|worker|reviewer   ACL (default: worker, or PLD_ROLE)',
    '',
    'Commands:',
    '  import-plans [--cleanup] [--json]',
    '  audit [--json]',
    '  go [--json]',
    '  claim-assignment --execution <id> --lane <Lane N> [--json]',
    '  report-result --execution <id> --lane <Lane N> --status <STATUS> --result-branch <branch> [--verification-summary <text>] [--json]',
    '',
    'Roles: coordinator = all commands; worker = audit, claim-assignment, report-result; reviewer = audit, report-result',
  ].join('\n');
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  // --help and no-command are role-independent; print usage and exit cleanly.
  if (!args.command || args.command === '--help' || args.command === 'help') {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const projectRoot = args.projectRoot || resolveProjectRoot();
  const role = resolveRole(args);
  if (!KNOWN_COMMAND_SET.has(args.command)) {
    throw createPldToolError({
      code: 'E_COMMAND_UNKNOWN',
      message: `Unknown command "${args.command}".`,
      expected: KNOWN_COMMANDS,
      received: args.command,
      hint: usage().split('\n')[0],
      category: 'contract',
    });
  }
  assertCommandAllowed(role, args.command);

  switch (args.command) {
    case 'import-plans': {
      const planImport = importPlanFiles(projectRoot, {cleanup: args.cleanup});
      const legacyImport = importLegacyExecutionState(projectRoot);
      printResult({...planImport, ...legacyImport}, args.json);
      return;
    }
    case 'audit':
      printResult(auditExecutor(projectRoot), args.json);
      return;
    case 'go':
      printResult(goExecutor(projectRoot), args.json);
      return;
    case 'claim-assignment':
      if (!args.execution || !args.lane) {
        throw createPldToolError({
          code: 'E_FIELD_REQUIRED',
          message: 'claim-assignment requires --execution and --lane.',
          expected: ['--execution <id>', '--lane <Lane N>'],
          received: {execution: args.execution || null, lane: args.lane || null},
          category: 'contract',
        });
      }
      printResult(claimAssignment(projectRoot, args.execution, args.lane), args.json);
      return;
    case 'report-result':
      if (!args.execution || !args.lane || !args.status || !args.resultBranch) {
        throw createPldToolError({
          code: 'E_FIELD_REQUIRED',
          message: 'report-result requires --execution, --lane, --status, and --result-branch.',
          expected: ['--execution <id>', '--lane <Lane N>', '--status <STATUS>', '--result-branch <branch>'],
          received: {
            execution: args.execution || null,
            lane: args.lane || null,
            status: args.status || null,
            resultBranch: args.resultBranch || null,
          },
          category: 'contract',
        });
      }
      printResult(
        reportResult(projectRoot, args.execution, args.lane, args.status, args.resultBranch, {
          verificationSummary: args.verificationSummary || null,
        }),
        args.json,
      );
      return;
    default:
      throw createPldToolError({
        code: 'E_CONTRACT_VIOLATION',
        message: 'Unreachable command branch after validation.',
        expected: KNOWN_COMMANDS,
        received: args.command,
        category: 'contract',
      });
  }
}

function writeStructuredCliError(error, pretty) {
  const shape = structuredErrorShape(error);
  if (!shape) {
    return false;
  }
  const line = pretty ? `${JSON.stringify(shape, null, 2)}\n` : `${JSON.stringify(shape)}\n`;
  process.stderr.write(line);
  return true;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  try {
    main(argv);
  } catch (error) {
    const pretty = Boolean(args.json);
    if (writeStructuredCliError(error, pretty)) {
      process.exitCode = exitCodeForPldError(error);
      return;
    }
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  parseArgs,
  ROLE_COMMANDS,
  resolveRole,
  assertCommandAllowed,
  KNOWN_COMMANDS,
};
