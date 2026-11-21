"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/app/_lib/current-user";
import {
  type ActionState,
  actionLogger,
  toActionError,
} from "@/app/actions/shared";
import { getInjection } from "@/di/container";
import type { Photo, PhotoType } from "@/src/entities/profile-photo";

// What A4 and E6 send: their fields as text, which the controller checks.
function fieldsOf(formData: FormData) {
  const field = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    name: field("name"),
    pieceShape: field("pieceShape"),
    pieceColor: field("pieceColor"),
    phone: field("phone"),
  };
}

// The photo the form carries, if one was chosen: the shrunk picture as bytes. What type it is
// and how big, the controller checks again.
async function photoOf(formData: FormData): Promise<Photo | undefined> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type as PhotoType,
  };
}

// The header's piece and You show the profile on every page, so the whole signed-in layout is
// revalidated (KTD16).
function revalidateProfile(): void {
  revalidatePath("/", "layout");
}

// A4's Next: the profile and its settings, then the photo if one was chosen. The form goes on to
// the home-screen step itself (A5 joins before it with U10): a redirect from here would reach the
// form as a failed send. A second send updates what's there, so a photo that fails can be sent
// again with the rest.
export async function createProfile(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("ICreateProfileController")(fieldsOf(formData), userId);
    const photo = await photoOf(formData);
    if (photo) {
      await getInjection("ISetPhotoController")({ photo }, userId);
    }
  } catch (err) {
    return toActionError(
      err,
      actionLogger("createProfile"),
      "Couldn’t save that. Try again.",
    );
  }
  revalidateProfile();
  return { message: "Profile saved." };
}

// E6's Save: the name, phone and piece, and a new photo if one was chosen (which removes the old
// one).
export async function updateProfile(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const userId = await getCurrentUserId();
    await getInjection("IUpdateProfileController")(fieldsOf(formData), userId);
    const photo = await photoOf(formData);
    if (photo) {
      await getInjection("ISetPhotoController")({ photo }, userId);
    }
  } catch (err) {
    return toActionError(
      err,
      actionLogger("updateProfile"),
      "Couldn’t save that. Try again.",
    );
  }
  revalidateProfile();
  return { message: "Profile saved." };
}

export async function removePhoto(): Promise<ActionState> {
  try {
    await getInjection("IRemovePhotoController")(await getCurrentUserId());
  } catch (err) {
    return toActionError(
      err,
      actionLogger("removePhoto"),
      "Couldn’t remove the photo. Try again.",
    );
  }
  revalidateProfile();
  return null;
}
