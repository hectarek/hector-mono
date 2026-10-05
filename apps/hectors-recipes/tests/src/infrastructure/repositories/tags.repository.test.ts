import { beforeEach, describe, expect, it } from "bun:test";
import { TagsRepository } from "@/src/infrastructure/repositories/tags.repository";
import { MockTagsRepository } from "@/src/infrastructure/repositories/tags.repository.mock";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { resetDatabase } from "@/tests/_support/database";

// The tag catalog (docs/ux-plan.md D55), on the real table from migration 0013.
describe("TagsRepository [postgres]", () => {
  beforeEach(resetDatabase);

  it("starts with the migration's tags, each in the group the code gives it", async () => {
    const groups = await new TagsRepository(
      new MockLoggerService(),
    ).listGroups();
    expect(groups).toEqual(await new MockTagsRepository().listGroups());
    expect(groups["dinner"]).toBe("meal");
    expect(groups["middle eastern"]).toBe("cuisine");
    expect(groups["high-protein"]).toBe("diet");
  });
});
