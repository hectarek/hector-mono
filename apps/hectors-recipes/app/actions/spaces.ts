"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { SPACE_TYPE_HOME, spaceHref } from "@/app/_lib/space-href";
import {
  type ActionState,
  actionLogger,
  text,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { InviteRole } from "@/src/entities/models/space.model";

export async function createBook(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let href: string;
  try {
    const space = await getInjection("ICreateSpaceController")(
      { type: "recipe-book", name: text(formData, "name") },
      await getCurrentUserId(),
    );
    href = spaceHref(space);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("createBook"),
      "Couldn't create the book.",
    );
  }
  revalidatePath("/books");
  redirect(href);
}

export async function renameSpace(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const spaceId = text(formData, "spaceId");
  try {
    await getInjection("IRenameSpaceController")(
      { spaceId, name: text(formData, "name") },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("renameSpace"),
      "Couldn't rename it.",
    );
  }
  revalidatePath("/", "layout");
  return { message: "Saved" };
}

// The book or plan the app opens to; an empty spaceId clears it (books: All recipes).
export async function setDefaultSpace(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await getInjection("ISetDefaultSpaceController")(
      {
        type: text(formData, "type"),
        spaceId: text(formData, "spaceId") ?? null,
      },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setDefaultSpace"),
      "Couldn't save that.",
    );
  }
  revalidatePath("/", "layout");
  return { message: "Saved" };
}

export async function deleteSpace(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let type: keyof typeof SPACE_TYPE_HOME;
  try {
    type = await getInjection("IDeleteSpaceController")(
      { spaceId: text(formData, "spaceId") },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("deleteSpace"),
      "Couldn't delete it.",
    );
  }
  revalidatePath("/", "layout");
  redirect(SPACE_TYPE_HOME[type]);
}

export async function createInvite(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const spaceId = text(formData, "spaceId");
  try {
    await getInjection("ICreateInviteController")(
      { spaceId, role: text(formData, "role") },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("createInvite"),
      "Couldn't create a link.",
    );
  }
  revalidatePath(`/spaces/${spaceId}/settings`);
  return null;
}

export type InviteLinksState =
  | { ok: true; tokens: Record<InviteRole, string> }
  | { ok: false; error: string };

// The Invite sheet's links, one per role (made if needed), fetched when the sheet opens.
export async function inviteLinks(spaceId: string): Promise<InviteLinksState> {
  try {
    const links = await getInjection("IEnsureInviteLinksController")(
      { spaceId },
      await getCurrentUserId(),
    );
    return {
      ok: true,
      tokens: { editor: links.editor.token, viewer: links.viewer.token },
    };
  } catch (err) {
    const state = toActionError(
      err,
      actionLogger("inviteLinks"),
      "Couldn't get a link.",
    );
    return { ok: false, error: state?.error ?? "Couldn't get a link." };
  }
}

export async function revokeInvite(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const spaceId = await getInjection("IRevokeInviteController")(
      { inviteId: text(formData, "inviteId") },
      await getCurrentUserId(),
    );
    revalidatePath(`/spaces/${spaceId}/settings`);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("revokeInvite"),
      "Couldn't turn off the link.",
    );
  }
  return null;
}

export async function acceptInvite(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let href: string;
  try {
    const space = await getInjection("IAcceptInviteController")(
      {
        token: text(formData, "token"),
        makeDefault: formData.has("makeDefault"),
      },
      await getCurrentUserId(),
    );
    href = spaceHref(space);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("acceptInvite"),
      "Couldn't join. Try again.",
    );
  }
  revalidatePath("/", "layout");
  redirect(href);
}

// For someone in a shared plan who owns none (D16): their own plan, which becomes the one
// they open to.
export async function startOwnPlan(): Promise<ActionState> {
  let href: string;
  try {
    const userId = await getCurrentUserId();
    const plan = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      userId,
    );
    await getInjection("ISetDefaultSpaceController")(
      { type: "meal-plan", spaceId: plan.id },
      userId,
    );
    href = spaceHref(plan);
  } catch (err) {
    return toActionError(
      err,
      actionLogger("startOwnPlan"),
      "Couldn't start your meal plan.",
    );
  }
  revalidatePath("/", "layout");
  redirect(href);
}

export async function setMemberRole(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const spaceId = text(formData, "spaceId");
  try {
    await getInjection("IUpdateMemberRoleController")(
      {
        spaceId,
        memberId: text(formData, "memberId"),
        role: text(formData, "role"),
      },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("setMemberRole"),
      "Couldn't change the role.",
    );
  }
  revalidatePath(`/spaces/${spaceId}/settings`);
  return null;
}

export async function removeMember(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const spaceId = text(formData, "spaceId");
  const memberId = text(formData, "memberId");
  const userId = await getCurrentUserId();
  try {
    await getInjection("IRemoveMemberController")(
      { spaceId, memberId },
      userId,
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removeMember"),
      "Couldn't remove them.",
    );
  }
  revalidatePath("/", "layout");
  if (memberId === userId) {
    // Only ever one of the known tab paths, never an arbitrary URL from the form.
    const home = Object.values(SPACE_TYPE_HOME).find(
      (path) => path === text(formData, "home"),
    );
    redirect(home ?? "/");
  }
  return null;
}

export async function adoptRecipes(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const targetSpaceId = text(formData, "targetSpaceId");
  try {
    await getInjection("IAdoptRecipesController")(
      {
        recipeIds: formData
          .getAll("recipeId")
          .filter((id) => typeof id === "string"),
        targetSpaceId,
      },
      await getCurrentUserId(),
    );
  } catch (err) {
    return toActionError(
      err,
      actionLogger("adoptRecipes"),
      "Couldn't copy the recipes.",
    );
  }
  revalidatePath("/");
  redirect(`/?book=${targetSpaceId}`);
}
