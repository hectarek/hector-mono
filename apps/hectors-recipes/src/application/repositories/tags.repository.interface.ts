import type { TagGroups } from "@/src/entities/models/tag.model";

export interface ITagsRepository {
  // Every grouped tag's group (docs/ux-plan.md D55). A tag that isn't here has no group.
  listGroups(): Promise<TagGroups>;
}
