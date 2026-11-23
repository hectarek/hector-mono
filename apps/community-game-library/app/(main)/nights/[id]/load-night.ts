import { notFound } from "next/navigation";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";

// Everything a night's pages read, through its controller: a night the member can't see, or an
// id that isn't one, is Not found (AE5).
export async function loadNight(gameNightId: string, userId: string) {
  try {
    return await getInjection("IGetNightController")({ gameNightId }, userId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    throw err;
  }
}
