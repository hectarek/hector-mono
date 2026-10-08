import { beforeEach, describe, expect, it } from "bun:test";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteLinks } from "@/app/_components/invite-links";
import { MemberList } from "@/app/_components/member-list";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// P25.1, fix 9: removing a member, leaving and turning off a link ask first, as deleting does.
describe("the members page's confirmations", () => {
  let owner: string;
  let partner: string;
  let spaceId: string;

  beforeEach(async () => {
    partner = crypto.randomUUID();
    owner = signInAsNewUser();
    spaceId = (
      await getInjection("ICreateSpaceController")(
        { type: "recipe-book", name: "Ours" },
        owner,
      )
    ).id;
    const links = await getInjection("IEnsureInviteLinksController")(
      { spaceId },
      owner,
    );
    await getInjection("IAcceptInviteController")(
      { token: links.viewer.token },
      partner,
    );
  });

  const settings = () =>
    getInjection("IGetSpaceSettingsController")({ spaceId }, owner);

  it("asks before removing a member, and Cancel keeps them", async () => {
    const user = userEvent.setup();
    const view = render(
      <MemberList
        spaceId={spaceId}
        spaceName="Ours"
        members={(await settings()).members}
        viewerRole="owner"
        viewerId={owner}
        home="/"
      />,
    );

    await user.click(view.getByRole("button", { name: "Remove" }));
    let dialog = view.getByRole("dialog");
    within(dialog).getByText("They'll no longer see “Ours”.", { exact: false });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect((await settings()).members).toHaveLength(2);

    await user.click(view.getByRole("button", { name: "Remove" }));
    dialog = view.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));
    await waitFor(async () =>
      expect((await settings()).members.map((m) => m.userId)).toEqual([owner]),
    );
  });

  it("asks before leaving", async () => {
    const user = userEvent.setup();
    const members = (await settings()).members;
    const view = render(
      <MemberList
        spaceId={spaceId}
        spaceName="Ours"
        members={members}
        viewerRole="viewer"
        viewerId={partner}
        home="/"
      />,
    );

    await user.click(view.getByRole("button", { name: "Leave" }));
    within(view.getByRole("dialog")).getByRole("heading", {
      name: "Leave “Ours”?",
    });
  });

  it("asks before turning a link off", async () => {
    const user = userEvent.setup();
    const { invites } = await settings();
    const view = render(
      <InviteLinks spaceId={spaceId} spaceName="Ours" invites={invites} />,
    );

    const [first] = view.getAllByRole("button", { name: "Turn off" });
    if (!first) throw new Error("No link to turn off");
    await user.click(first);
    const dialog = view.getByRole("dialog", { name: "Turn off this link?" });
    await user.click(within(dialog).getByRole("button", { name: "Turn off" }));
    await waitFor(async () =>
      expect((await settings()).invites).toHaveLength(invites.length - 1),
    );
  });
});
