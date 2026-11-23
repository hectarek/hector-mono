import { gate } from "@/app/_lib/account";
import { getInjection } from "@/di/container";
import { calendarFile, calendarFileName } from "@/src/entities/calendar-file";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";

// The night, for someone who can see it (KTD4), or null for anyone else and an id that isn't one.
async function nightFor(gameNightId: string, userId: string) {
  try {
    const page = await getInjection("IGetNightController")(
      { gameNightId },
      userId,
    );
    return page.night;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      return null;
    }
    throw err;
  }
}

// A night's calendar file (KTD24, R35), which Add to my calendar on D7 and D13 downloads. Anyone
// who can't see the night gets Not found, as its page does (AE5).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { user } = await gate("app");
  const night = await nightFor((await params).id, user.id);
  if (!night) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(
    calendarFile(night, {
      url: new URL(`/nights/${night.id}`, request.url).toString(),
      now: new Date(),
    }),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${calendarFileName(night.title)}"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
