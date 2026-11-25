import type { IGamesRepository } from "@/src/application/repositories/games.repository.interface";
import type { IRequireAdmin } from "@/src/application/use-cases/admin/require-admin";

export type IListCategoriesUseCase = ReturnType<typeof listCategoriesUseCase>;

// G3's and G4's categories to tap (Hector, 2026-11-25): every category the catalog's games use,
// the most used first. Only the admin reads them.
export const listCategoriesUseCase = (
  requireAdmin: IRequireAdmin,
  gamesRepository: IGamesRepository,
) => {
  return async (userId: string): Promise<string[]> => {
    requireAdmin(userId);
    return gamesRepository.listCategories();
  };
};
