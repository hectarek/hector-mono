import { describe, expect, it } from "bun:test";
import {
  confirmed,
  isTestDatabase,
  pendingSummary,
  typeKeys,
  urlRefusal,
} from "@/scripts/migrate-production";

// Fictional Neon addresses: .env's stands in for the test project's, the other for production's.
const ENV_URL =
  "postgresql://tester:test-secret@ep-example-123-pooler.c-1.us-east-1.aws.neon.tech/neondb?sslmode=require";
const OTHER_URL =
  "postgresql://owner:other-secret@ep-example-456.c-1.us-east-1.aws.neon.tech/neondb?sslmode=require";

function expectRefused(url: string): void {
  const refusal = urlRefusal(url, ENV_URL);
  expect(refusal).toBeString();
  // Compared without printing either: the reason never quotes a URL, its host or its password.
  expect(refusal).not.toContain("secret");
  expect(refusal).not.toContain("ep-example");
}

describe("urlRefusal", () => {
  it.each([
    "mysql://owner:other-secret@ep-example-456.c-1.us-east-1.aws.neon.tech/neondb",
    "https://ep-example-456.c-1.us-east-1.aws.neon.tech/neondb",
    "ep-example-456.c-1.us-east-1.aws.neon.tech",
    "psql 'postgresql://owner:other-secret@ep-example-456.c-1.us-east-1.aws.neon.tech/neondb'",
    "postgresql://",
    "",
  ])("refuses %p, which isn't a Postgres URL", (url) => {
    expectRefused(url);
  });

  it("refuses the URL .env holds, the test project's", () => {
    expectRefused(ENV_URL);
  });

  it("passes another postgres:// or postgresql:// URL", () => {
    expect(urlRefusal(OTHER_URL, ENV_URL)).toBeNull();
    expect(
      urlRefusal(OTHER_URL.replace("postgresql://", "postgres://"), ENV_URL),
    ).toBeNull();
  });

  it("passes a Postgres URL when .env has none", () => {
    expect(urlRefusal(OTHER_URL, undefined)).toBeNull();
  });
});

describe("isTestDatabase", () => {
  it("knows the test project by its database's comment", () => {
    expect(isTestDatabase("job-search-test")).toBe(true);
  });

  it.each([null, "", "another note"])(
    "takes a database commented %p for another project",
    (note) => {
      expect(isTestDatabase(note)).toBe(false);
    },
  );
});

describe("pendingSummary", () => {
  const tags = ["0000_activity", "0001_jobs"];

  it("lists every migration when none is applied", () => {
    expect(pendingSummary(tags, 0)).toEqual({ applied: 0, pending: tags });
  });

  it("lists the migrations after the applied ones", () => {
    expect(pendingSummary(tags, 1)).toEqual({
      applied: 1,
      pending: ["0001_jobs"],
    });
  });

  it("lists none when all are applied", () => {
    expect(pendingSummary(tags, 2)).toEqual({ applied: 2, pending: [] });
  });

  it("counts a missing migrations table as none applied", () => {
    expect(pendingSummary(tags, null)).toEqual({ applied: 0, pending: tags });
  });
});

describe("confirmed", () => {
  it("continues only on migrate", () => {
    expect(confirmed("migrate")).toBe(true);
  });

  it.each([
    "",
    "y",
    "yes",
    "Migrate",
    " migrate",
    "migrate ",
    "migrate now",
    null,
  ])("stops on %p", (answer) => {
    expect(confirmed(answer)).toBe(false);
  });
});

describe("typeKeys", () => {
  it("keeps the keys typed until Enter", () => {
    expect(typeKeys("post", "gres")).toEqual({ line: "postgres" });
  });

  it("ends the line at Enter and drops what came after it", () => {
    expect(typeKeys("", "postgres://x\r")).toEqual({
      line: "postgres://x",
      end: "enter",
    });
    expect(typeKeys("post", "gres\nmigrate")).toEqual({
      line: "postgres",
      end: "enter",
    });
  });

  it("deletes the last character on Backspace", () => {
    expect(typeKeys("postgres", "\u007f\u007f")).toEqual({ line: "postgr" });
    expect(typeKeys("p", "\b")).toEqual({ line: "" });
    expect(typeKeys("", "\u007f")).toEqual({ line: "" });
  });

  it("aborts on Ctrl-C", () => {
    expect(typeKeys("postgres", "\u0003").end).toBe("abort");
  });

  it("ignores other control keys", () => {
    expect(typeKeys("", "a\tb\u001b")).toEqual({ line: "ab" });
  });
});
