import type { Game } from "@/src/entities/game";

export interface IGamesRepository {
  search(searchTitle: string, limit: number): Promise<Game[]>;
  getById(id: string): Promise<Game | undefined>;
}
