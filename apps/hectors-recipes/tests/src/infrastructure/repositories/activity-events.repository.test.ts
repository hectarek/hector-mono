import { beforeEach, describe, expect, it } from "bun:test";
import { newActivity } from "@/src/entities/models/activity-event.model";
import { ActivityEventsRepository } from "@/src/infrastructure/repositories/activity-events.repository";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { makeApp, OWNER, postgresRepositories } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

// What people do (D106), on the real table from migration 0021.
describe("ActivityEventsRepository [postgres]", () => {
  const activity = new ActivityEventsRepository(new MockLoggerService());

  beforeEach(resetDatabase);

  const recipes = async (count: number) => {
    const app = makeApp(postgresRepositories());
    const bookId = await app.newSpace("recipe-book");
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push((await app.newRecipe(bookId, { title: `Recipe ${i}` })).id);
    }
    return { bookId, ids };
  };
  const viewed = (recipeId: string) =>
    newActivity("recipe-viewed", OWNER, { recipeId }, {});

  it("keeps events in the order they happened, within one tick of the clock", async () => {
    const { ids } = await recipes(5);
    for (const id of ids) await activity.add(viewed(id));
    expect(await activity.recentRecipeIds(OWNER, "recipe-viewed")).toEqual(
      [...ids].reverse(),
    );
    expect((await activity.latest(OWNER, "recipe-viewed"))?.recipeId).toBe(
      ids.at(-1),
    );
  });

  it("stores the details, and leaves a kind the code doesn't know out of latest", async () => {
    const { ids } = await recipes(1);
    await activity.add(viewed(ids[0] ?? ""));
    await sql(
      `insert into activity_events (user_id, type, occurred_at) values ($1, 'retired-kind', now() + interval '1 hour')`,
      [OWNER],
    );
    const [row] = await sql<{ details: unknown }>(
      `select details from activity_events where type = 'recipe-viewed'`,
    );
    expect(row?.details).toEqual({});
    expect((await activity.latest(OWNER, "recipe-viewed"))?.recipeId).toBe(
      ids[0],
    );
  });

  it("goes with the recipe or the space it's about", async () => {
    const { bookId, ids } = await recipes(2);
    const [kept = "", gone = ""] = ids;
    await activity.add(viewed(kept));
    await activity.add(viewed(gone));
    await activity.add(
      newActivity("recipe-viewed", OWNER, { spaceId: bookId }, {}),
    );

    await sql("delete from recipes where id = $1", [gone]);
    expect(await activity.recentRecipeIds(OWNER, "recipe-viewed")).toEqual([
      kept,
    ]);
    await sql("delete from spaces where id = $1", [bookId]);
    expect(await sql("select id from activity_events")).toEqual([]);
  });
});
