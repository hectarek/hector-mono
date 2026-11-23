import { getInjection } from "@/di/container";
import { loggable } from "@/src/entities/errors/loggable";

// The daily run (docs/build-plan.md KTD8, U17): vercel.json's schedule posts here each morning at
// 7 in Eastern time, with CRON_SECRET as a bearer token. With no secret set, or any other token, it
// does nothing and answers 401. It answers with how many reminders it wrote and returns it closed.
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  try {
    return Response.json(await getInjection("IRunDailyController")());
  } catch (err) {
    getInjection("ILoggerService")
      .child({ layer: "route", op: "runDaily" })
      .error("The daily run failed", loggable(err));
    return new Response(null, { status: 500 });
  }
}
