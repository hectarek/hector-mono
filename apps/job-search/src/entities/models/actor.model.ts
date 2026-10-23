// Who a signed-in session acts as (docs/build-plan.md KTD2): Hector's account is the owner,
// Claude's is the agent. No other account gets one.
export type Actor = "owner" | "agent";

// A session the app lets in: who is acting, and whose rows they act on. Hector owns every
// row, so the agent acts on the owner's.
export type CurrentActor = { actor: Actor; ownerId: string };
