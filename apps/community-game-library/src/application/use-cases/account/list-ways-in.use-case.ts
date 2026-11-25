import type { ISignInsRepository } from "@/src/application/repositories/sign-ins.repository.interface";
import type { WayIn } from "@/src/entities/ways-in";

export type IListWaysInUseCase = ReturnType<typeof listWaysInUseCase>;

// How the member signs in (E5's account line; Hector, 2026-11-25): Google, a password, or both,
// read from their own sign-in.
export const listWaysInUseCase = (signInsRepository: ISignInsRepository) => {
  return async (userId: string): Promise<WayIn[]> =>
    signInsRepository.listWaysIn(userId);
};
