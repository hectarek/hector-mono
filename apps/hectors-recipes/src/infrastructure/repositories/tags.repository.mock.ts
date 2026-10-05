import type { ITagsRepository } from "@/src/application/repositories/tags.repository.interface";
import {
  STARTING_TAGS,
  TAG_CATEGORIES,
  type TagGroups,
} from "@/src/entities/models/tag.model";

// Starts with the tags the migration adds, so tests see the same catalog on both backends.
export class MockTagsRepository implements ITagsRepository {
  groups: TagGroups = Object.fromEntries(
    TAG_CATEGORIES.flatMap((category) =>
      STARTING_TAGS[category].map((name) => [name, category]),
    ),
  );

  async listGroups(): Promise<TagGroups> {
    return { ...this.groups };
  }
}
