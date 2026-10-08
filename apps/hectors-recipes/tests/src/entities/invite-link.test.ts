import { describe, expect, it } from "bun:test";
import { inviteTokenFrom } from "@/src/entities/invite-link";

// P23.4: joining a book or plan by pasting its invite link.
describe("inviteTokenFrom", () => {
  const token = "Xk3p_9aQ-2LmZr7tW4yBn1cD";

  it("reads the token from the whole link, or the path alone", () => {
    expect(
      inviteTokenFrom(`https://recipes.hectorfgonzalez.com/join/${token}`),
    ).toBe(token);
    expect(inviteTokenFrom(`  /join/${token}\n`)).toBe(token);
    expect(inviteTokenFrom(`https://example.test/join/${token}?ref=1`)).toBe(
      token,
    );
  });

  it("finds no invite in anything else", () => {
    expect(inviteTokenFrom("")).toBe(null);
    expect(inviteTokenFrom(token)).toBe(null);
    expect(inviteTokenFrom("https://recipes.hectorfgonzalez.com/books")).toBe(
      null,
    );
    expect(inviteTokenFrom("/join/short")).toBe(null);
    expect(inviteTokenFrom(`/join/${token}<script>`)).toBe(null);
  });
});
