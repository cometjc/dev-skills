import { promises as fs } from "fs";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAskUserQuestionsCore } from "../ask-user-questions.js";
import { SessionManager } from "../../session/SessionManager.js";
import type { QuestionInput } from "../../shared/schemas.js";

describe("ask-user-questions timeout flows", () => {
  const testBaseDir = "/tmp/auq-test-core-timeout";
  const questions: QuestionInput[] = [
    {
      title: "Timeout",
      prompt: "Should this session timeout?",
      options: [{ label: "Yes" }, { label: "No" }],
      multiSelect: false,
    },
  ];

  beforeEach(async () => {
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  afterEach(async () => {
    await fs.rm(testBaseDir, { force: true, recursive: true }).catch(() => {});
  });

  it("marks blocking ask as timed_out when no answers are provided", async () => {
    const sessionManager = new SessionManager({
      baseDir: testBaseDir,
      sessionTimeout: 400,
    });
    const core = createAskUserQuestionsCore({ baseDir: testBaseDir, sessionManager });
    await core.ensureInitialized();

    await expect(core.ask(questions, "call-blocking")).rejects.toThrow("timed out");

    const ids = await sessionManager.getAllSessionIds();
    expect(ids).toHaveLength(1);

    const status = await sessionManager.getSessionStatus(ids[0]);
    expect(status?.status).toBe("timed_out");
  });

  it("returns timed_out for non-blocking session after timeout elapses", async () => {
    const sessionManager = new SessionManager({
      baseDir: testBaseDir,
      sessionTimeout: 300,
    });
    const core = createAskUserQuestionsCore({ baseDir: testBaseDir, sessionManager });
    await core.ensureInitialized();

    const { sessionId } = await core.askNonBlocking(questions, "call-nonblocking");
    await new Promise((resolve) => setTimeout(resolve, 900));

    const fetched = await core.getAnsweredQuestions(sessionId.slice(0, 8), false);
    expect(fetched.status).toBe("timed_out");
    expect(fetched.formattedResponse).toContain("Status: timed_out");

    const stored = await sessionManager.getSessionStatus(sessionId);
    expect(stored?.status).toBe("timed_out");
  });
});
