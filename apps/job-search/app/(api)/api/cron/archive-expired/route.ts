import { getInjection } from "@/di/container";
import { loggable } from "@/src/entities/errors/loggable";

// The daily run (docs/build-plan.md KTD24, U19): vercel.json's schedule posts here each morning
// at 5 in Eastern time, with CRON_SECRET as a bearer token. With no secret set, or any other token,
// it does nothing and answers 401. It answers how many jobs it archived.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  try {
    const { archived } = await getInjection("IArchiveExpiredController")();
    return Response.json({ archived: archived.length });
  } catch (err) {
    getInjection("ILoggerService")
      .child({ layer: "route", op: "archiveExpired" })
      .error("The daily run failed", loggable(err));
    return new Response(null, { status: 500 });
  }
}
