import { describe, expect, it, mock } from "bun:test";
import {
  importTo,
  parseArgs,
  reportLines,
  type Target,
} from "@/scripts/import-snapshot";
import type { Terminal } from "@/scripts/lib/terminal";
import type { ImportReport } from "@/src/entities/models/import-snapshot.model";

const OWNER = "00000000-0000-4000-8000-000000000001";

const report = (overrides: Partial<ImportReport> = {}): ImportReport => ({
  commit: false,
  created: { company: ["c1"], job: ["j1", "j2"], person: [], practice: [] },
  skipped: { company: [], job: [], person: ["p1"], practice: [] },
  problems: [],
  undated: [],
  refused: null,
  ...overrides,
});

// A terminal that answers each question in turn and keeps what was said.
const scripted = (...answers: (string | null)[]) => {
  const said: string[] = [];
  const terminal: Terminal = {
    print: (line) => {
      said.push(line);
    },
    refuse: (reason) => {
      said.push(`refused: ${reason}`);
      return 1;
    },
    ask: async () => answers.shift() ?? null,
  };
  return { said, terminal };
};

const target = (overrides: Partial<Target> = {}): Target => ({
  ownerExists: async () => true,
  isTestDatabase: async () => false,
  ...overrides,
});

describe("the import script's arguments", () => {
  it("reads the snapshot's path, the owner and the flags", () => {
    expect(
      parseArgs(["snapshot.json", `--owner=${OWNER}`, "--commit"]),
    ).toEqual({
      path: "snapshot.json",
      ownerId: OWNER,
      commit: true,
      test: false,
    });
  });

  it("refuses a missing path or owner, and a commit with --test", () => {
    expect(parseArgs([`--owner=${OWNER}`])).toEqual(expect.any(String));
    expect(parseArgs(["snapshot.json"])).toEqual(expect.any(String));
    expect(parseArgs(["snapshot.json", "--owner=not-an-id"])).toEqual(
      expect.any(String),
    );
    expect(
      parseArgs(["snapshot.json", `--owner=${OWNER}`, "--commit", "--test"]),
    ).toEqual(expect.any(String));
  });
});

describe("the import script", () => {
  it("stops before anything is read or written when the owner isn't a user in the target", async () => {
    const run = mock(async () => report());
    const { said, terminal } = scripted();

    const code = await importTo(
      target({ ownerExists: async () => false }),
      terminal,
      run,
      { ownerId: OWNER, commit: true, test: false },
    );

    expect(code).toBe(1);
    expect(run).not.toHaveBeenCalled();
    expect(said).toEqual([expect.stringMatching(/^refused: .*Neon Auth/)]);
  });

  it("runs --test only against the test project", async () => {
    const run = mock(async () => report());
    const { terminal } = scripted();

    expect(
      await importTo(target(), terminal, run, {
        ownerId: OWNER,
        commit: false,
        test: true,
      }),
    ).toBe(1);
    expect(run).not.toHaveBeenCalled();
  });

  it("dry-runs by default: reports, and asks nothing", async () => {
    const run = mock(async (commit: boolean) => report({ commit }));
    const { said, terminal } = scripted();

    const code = await importTo(target(), terminal, run, {
      ownerId: OWNER,
      commit: false,
      test: false,
    });

    expect(code).toBe(0);
    expect(run.mock.calls).toEqual([[false]]);
    expect(said[0]).toBe(
      "Would create: 1 company, 2 job, 0 person, 0 practice",
    );
  });

  it("won't start a commit while a job lacks its status date", async () => {
    const run = mock(async (commit: boolean) =>
      report({ commit, undated: ["j2"] }),
    );
    const { said, terminal } = scripted("import");

    const code = await importTo(target(), terminal, run, {
      ownerId: OWNER,
      commit: true,
      test: false,
    });

    expect(code).toBe(1);
    expect(run.mock.calls).toEqual([[false]]);
    expect(said).toContain("Job j2 is past applied with no status date");
  });

  it("commits only once import is typed", async () => {
    const run = mock(async (commit: boolean) => report({ commit }));
    const stopped = scripted("yes");
    expect(
      await importTo(target(), stopped.terminal, run, {
        ownerId: OWNER,
        commit: true,
        test: false,
      }),
    ).toBe(1);
    expect(run.mock.calls).toEqual([[false]]);

    const typed = scripted("import");
    expect(
      await importTo(target(), typed.terminal, run, {
        ownerId: OWNER,
        commit: true,
        test: false,
      }),
    ).toBe(0);
    expect(run.mock.calls.at(-1)).toEqual([true]);
    expect(typed.said).toContain(
      "Created: 1 company, 2 job, 0 person, 0 practice",
    );
  });
});

describe("the import's report", () => {
  it("names each problem and each job that needs a status date", () => {
    expect(
      reportLines(
        report({
          problems: [{ kind: "job", ref: "j4", reason: "Unknown status" }],
          undated: ["j5"],
        }),
      ),
    ).toEqual([
      "Would create: 1 company, 2 job, 0 person, 0 practice",
      "Already imported, skipped: 0 company, 0 job, 1 person, 0 practice",
      "Not imported, job j4: Unknown status",
      "Job j5 is past applied with no status date",
    ]);
  });
});
