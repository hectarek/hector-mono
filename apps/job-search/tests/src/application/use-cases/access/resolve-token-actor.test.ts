import { describe, expect, it } from "bun:test";
import { resolveTokenActor } from "@/src/application/use-cases/access/resolve-token-actor";
import { NotAllowedError } from "@/src/entities/errors/common";

const OWNER = "00000000-0000-4000-8000-000000000001";
const AGENT = "00000000-0000-4000-8000-000000000002";
const STRANGER = "00000000-0000-4000-8000-000000000003";

describe("resolveTokenActor (KTD22)", () => {
  const resolve = resolveTokenActor({
    ownerUserId: OWNER,
    agentUserId: AGENT,
  });

  it("acts as Claude, on Hector's rows, for a token of Claude's account", () => {
    expect(resolve(AGENT)).toEqual({ actor: "agent", ownerId: OWNER });
  });

  it("refuses a token of Hector's account, so the endpoint never acts as him", () => {
    expect(() => resolve(OWNER)).toThrow(NotAllowedError);
  });

  it("refuses any other account's token", () => {
    expect(() => resolve(STRANGER)).toThrow(NotAllowedError);
  });

  it("refuses every token while an id is missing or malformed", () => {
    expect(() =>
      resolveTokenActor({ ownerUserId: OWNER, agentUserId: "not-a-uuid" })(
        "not-a-uuid",
      ),
    ).toThrow(NotAllowedError);
    expect(() => resolveTokenActor({ ownerUserId: OWNER })(AGENT)).toThrow(
      NotAllowedError,
    );
  });
});
