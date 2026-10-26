import type { IListSourcesUseCase } from "@/src/application/use-cases/sources/list-sources.use-case";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { LeadSource } from "@/src/entities/models/lead-source.model";

export type IListSourcesController = ReturnType<typeof listSourcesController>;

// The settings page's list of sources. It takes no input.
export const listSourcesController =
  (useCase: IListSourcesUseCase) =>
  ({ ownerId }: CurrentActor): Promise<LeadSource[]> =>
    useCase(ownerId);
