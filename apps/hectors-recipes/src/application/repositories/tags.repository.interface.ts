import type { TagGroups } from "@/src/entities/models/tag.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface ITagsRepository {
  // Every grouped tag's group (docs/ux-plan.md D55). A tag that isn't here has no group.
  listGroups(): Promise<TagGroups>;
  // Gives each tag its group, unless it has one: groups are shared, so the first one stays.
  addGroups(groups: TagGroups, tx?: ITransaction): Promise<void>;
}
