#!/usr/bin/env node

/**
 * Git clean/smudge filter for generated schema headers.
 * Normalizes volatile timestamp lines so git status/diff ignores them.
 */

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});

process.stdin.on("end", () => {
  const output = input.replace(
    /^(\s*\* Generated at:\s*).+$/m,
    "$1<filtered-timestamp>",
  );
  process.stdout.write(output);
});
