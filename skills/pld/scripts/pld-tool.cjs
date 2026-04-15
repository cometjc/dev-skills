#!/usr/bin/env node

const {
  auditExecutor,
  claimAssignment,
  goExecutor,
  importLegacyExecutionState,
  importPlanFiles,
  reportResult,
} = require('./pld-tool-lib.cjs');
const {resolveProjectRoot} = require('./pld-lib.cjs');

/** Subcommands each role may run (ACL). Default role is worker when unset (fail-closed vs coordinator). */
const WORKER_LIKE_COMMANDS = new Set(['audit', 'claim-assignment', 'report-result']);
const ROLE_COMMANDS = {
  coordinator: new Set(['import-plans', 'audit', 'go', 'claim-assignment', 'report-result']),
  worker: WORKER_LIKE_COMMANDS,
  coder: WORKER_LIKE_COMMANDS,
  reviewer: new Set(['audit', 'report-result']),
};

function resolveRole(args) {
  const raw = (args.role || process.env.PLD_ROLE || 'worker').trim().toLowerCase();
  if (!ROLE_COMMANDS[raw]) {
    throw new Error(
      `Invalid role "${raw}". Use --role <coordinator|worker|coder|reviewer> or PLD_ROLE (same values).`,
    );
  }
  return raw;
}

function assertCommandAllowed(role, command) {
  if (!command) {
    return;
  }
  const allowed = ROLE_COMMANDS[role];
  if (!allowed.has(command)) {
    throw new Error(
      `Role "${role}" is not allowed to run "${command}". Allowed: ${[...allowed].sort().join(', ')}`,
    );
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
    '  --role coordinator|worker|coder|reviewer   ACL (default: worker, or PLD_ROLE env; coder = alias of worker)',
    '',
    'Commands:',
    '  import-plans [--cleanup] [--json]',
    '  audit [--json]',
    '  go [--json]',
    '  claim-assignment --execution <id> --lane <Lane N> [--json]',
    '  report-result --execution <id> --lane <Lane N> --status <STATUS> --result-branch <branch> [--verification-summary <text>] [--json]',
    '',
    'Roles: coordinator = all commands; worker|coder = audit, claim-assignment, report-result; reviewer = audit, report-result',
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
        throw new Error('claim-assignment requires --execution and --lane');
      }
      printResult(claimAssignment(projectRoot, args.execution, args.lane), args.json);
      return;
    case 'report-result':
      if (!args.execution || !args.lane || !args.status || !args.resultBranch) {
        throw new Error(
          'report-result requires --execution, --lane, --status, and --result-branch',
        );
      }
      printResult(
        reportResult(projectRoot, args.execution, args.lane, args.status, args.resultBranch, {
          verificationSummary: args.verificationSummary || null,
        }),
        args.json,
      );
      return;
    default:
      throw new Error(usage());
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
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
};
