import { describe, expect, it } from "bun:test";
import { signedInLine } from "@/src/entities/ways-in";

const EMAIL = "robin@example.com";

// E5's account line says how the member signs in (Hector, 2026-11-25). A no-break space keeps
// the email beside its dot, as the board keeps "· robin@example.com" on one line.
describe("signedInLine", () => {
  it("names Google, a password, or both, then the email", () => {
    expect(signedInLine(["google"], EMAIL)).toBe(
      "Signed in with Google ·\u00a0robin@example.com",
    );
    expect(signedInLine(["password"], EMAIL)).toBe(
      "Signed in with a password ·\u00a0robin@example.com",
    );
    expect(signedInLine(["google", "password"], EMAIL)).toBe(
      "Signed in with Google or a password ·\u00a0robin@example.com",
    );
  });

  it("names Google first, and each way once, however they come", () => {
    expect(signedInLine(["password", "google", "password"], EMAIL)).toBe(
      "Signed in with Google or a password ·\u00a0robin@example.com",
    );
  });

  it("names the email alone with no way in the app offers", () => {
    expect(signedInLine([], EMAIL)).toBe("Signed in as robin@example.com");
  });
});
