import { notFound } from "next/navigation";
import {
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";

// An admin page's read through its controller: something that isn't there, a bad id, or anyone
// but the admin is Not found, so a member can't tell an admin page exists.
export async function adminRead<T>(read: () => Promise<T>): Promise<T> {
  try {
    return await read();
  } catch (err) {
    if (
      err instanceof NotFoundError ||
      err instanceof InputParseError ||
      err instanceof UnauthorizedError
    ) {
      notFound();
    }
    throw err;
  }
}
