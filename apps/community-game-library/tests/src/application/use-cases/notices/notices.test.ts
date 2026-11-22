import { beforeEach, expect, it } from "bun:test";
import type { NewNotice } from "@/src/entities/models/notice.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam, mei, jo, priya } = CAST.people;
const { priyaAskedForNightMarket, joHasGullAndAnchor } = CAST.loans;
const TODAY = "2026-11-10";

describeEachBackend("the inbox and the counts (U11)", () => {
  let app: ReturnType<typeof makeApp>;
  const tell = (notice: NewNotice) =>
    app.repos.transactions.startTransaction((tx) =>
      app.repos.notices.add(notice, tx),
    );

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("counts the cast's tabs as the boards do: 2 on Loans, 1 on Friends", async () => {
    // Priya asked for your Night Market, home; Jo asked for more time on Gull & Anchor; Ben's
    // place in Gull & Anchor's line waits for it to come back, so it isn't counted (C4).
    expect(await app.getTabCounts(you.id, TODAY)).toEqual({
      loans: 2,
      nights: 0,
      friends: 1,
      unread: 0,
    });
    expect((await app.getTabCounts(sam.id, TODAY)).loans).toBe(1);
  });

  it("lists a member's notices newest first with what they point at, and marks them read", async () => {
    await tell({
      userId: you.id,
      type: "loan-requested",
      createdBy: priya.id,
      loanId: priyaAskedForNightMarket.id,
    });
    await tell({
      userId: you.id,
      type: "more-time-asked",
      createdBy: jo.id,
      loanId: joHasGullAndAnchor.id,
    });

    const inbox = await app.listInbox(you.id);
    expect(inbox.map((one) => one.notice.type).sort()).toEqual([
      "loan-requested",
      "more-time-asked",
    ]);
    const requested = inbox.find((one) => one.notice.type === "loan-requested");
    expect(requested?.actor?.name).toBe("Priya");
    expect(requested?.loan).toMatchObject({
      gameTitle: "Night Market",
      ownerId: you.id,
      requestNote: "Can I grab it Friday?",
    });
    expect((await app.getTabCounts(you.id, TODAY)).unread).toBe(2);

    await app.markInboxRead(
      inbox.map((one) => one.notice.id),
      you.id,
    );
    expect((await app.getTabCounts(you.id, TODAY)).unread).toBe(0);
    expect(
      (await app.listInbox(you.id)).every((one) => one.notice.readAt !== null),
    ).toBe(true);
  });

  it("marks only the notices the inbox listed: one that came after, or that a group switched off hides, stays unread", async () => {
    await tell({
      userId: you.id,
      type: "more-time-asked",
      createdBy: jo.id,
      loanId: joHasGullAndAnchor.id,
    });
    const listed = (await app.listInbox(you.id)).map((one) => one.notice.id);
    await app.updateNoticeSettings("requests-on-my-games", false, you.id);
    await tell({
      userId: you.id,
      type: "loan-requested",
      createdBy: priya.id,
      loanId: priyaAskedForNightMarket.id,
    });
    await tell({
      userId: you.id,
      type: "more-time-asked",
      createdBy: jo.id,
      loanId: joHasGullAndAnchor.id,
    });

    await app.markInboxRead(listed, you.id);
    expect((await app.getTabCounts(you.id, TODAY)).unread).toBe(1);
    await app.updateNoticeSettings("requests-on-my-games", true, you.id);
    expect(
      (await app.listInbox(you.id))
        .filter((one) => one.notice.readAt === null)
        .map((one) => one.notice.type)
        .sort(),
    ).toEqual(["loan-requested", "more-time-asked"]);
  });

  it("leaves another member's notices as they were", async () => {
    const theirs = await tell({
      userId: priya.id,
      type: "request-accepted",
      createdBy: you.id,
      loanId: priyaAskedForNightMarket.id,
    });
    await app.markInboxRead([theirs.id], you.id);
    expect((await app.getTabCounts(priya.id, TODAY)).unread).toBe(1);
  });

  it("hides a group switched off from the inbox and the bell, and keeps every tab's count", async () => {
    const [request] = (await app.listFriends(you.id)).requestsToYou;
    await tell({
      userId: you.id,
      type: "friend-request",
      createdBy: mei.id,
      friendRequestId: request?.requestId,
    });
    const before = await app.getTabCounts(you.id, TODAY);
    expect(before.unread).toBe(1);

    await app.updateNoticeSettings("friend-requests", false, you.id);

    expect(await app.getNoticeSettings(you.id)).toEqual([
      "friend-requests",
      "night-mornings",
    ]);
    expect(await app.listInbox(you.id)).toEqual([]);
    expect(await app.getTabCounts(you.id, TODAY)).toEqual({
      ...before,
      unread: 0,
    });

    await app.updateNoticeSettings("friend-requests", true, you.id);
    expect(await app.listInbox(you.id)).toHaveLength(1);
  });

  it("starts every member with the morning-of-a-night reminder off", async () => {
    expect(await app.getNoticeSettings(sam.id)).toEqual(["night-mornings"]);
    await app.updateNoticeSettings("night-mornings", true, sam.id);
    expect(await app.getNoticeSettings(sam.id)).toEqual([]);
  });
});
