import { z } from "zod";

// A plan's grocery list is part of the plan (its items carry the plan's id), not a space.
export const spaceTypeSchema = z.enum(["recipe-book", "meal-plan"]);
export type SpaceType = z.infer<typeof spaceTypeSchema>;

const spaceRoleSchema = z.enum(["owner", "editor", "viewer"]);
export type SpaceRole = z.infer<typeof spaceRoleSchema>;

export const inviteRoleSchema = spaceRoleSchema.exclude(["owner"]);
export type InviteRole = z.infer<typeof inviteRoleSchema>;

const ROLE_RANK: Record<SpaceRole, number> = {
  viewer: 0,
  editor: 1,
  owner: 2,
};

export function hasRole(role: SpaceRole, minRole: SpaceRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

// A new book or plan is named after its owner ("Hector's Plan"), so two people's plans can
// be told apart; these are for an account with no name.
const PERSONAL_SPACE_NAMES: Record<SpaceType, string> = {
  "recipe-book": "My Recipes",
  "meal-plan": "My Plan",
};

const PERSONAL_SPACE_NOUNS: Record<SpaceType, string> = {
  "recipe-book": "Recipes",
  "meal-plan": "Plan",
};

// First word only: a full name makes a long title.
export function personalSpaceName(
  type: SpaceType,
  ownerName: string | null,
): string {
  const [first] = ownerName?.trim().split(/\s+/) ?? [];
  return first
    ? `${first}'s ${PERSONAL_SPACE_NOUNS[type]}`
    : PERSONAL_SPACE_NAMES[type];
}

const spaceSchema = z.object({
  id: z.uuid(),
  type: spaceTypeSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Space = z.infer<typeof spaceSchema>;

export const createSpaceSchema = z.object({
  type: spaceTypeSchema,
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(80),
  description: z.string().trim().optional(),
});
export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;

export type SpaceAccess = {
  type: SpaceType;
  role: SpaceRole | null;
};

// isDefault: the one of its type they chose to open to (ux-plan D14, D17).
export type SpaceWithRole = Space & { role: SpaceRole; isDefault: boolean };

export const setDefaultSpaceSchema = z.object({
  type: spaceTypeSchema,
  // A book or plan they're in; null clears the choice (for books: All recipes).
  spaceId: z.uuid().nullable(),
});
export type SetDefaultSpaceInput = z.infer<typeof setDefaultSpaceSchema>;

export type SpaceMember = {
  userId: string;
  role: SpaceRole;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type SpaceInvite = {
  id: string;
  spaceId: string;
  token: string;
  role: InviteRole;
  createdAt: Date;
};

export type InvitePreview = {
  spaceId: string;
  spaceName: string;
  spaceType: SpaceType;
  role: InviteRole;
  alreadyMember: boolean;
  // Joining this plan would leave a plan of their own that's in use (D15).
  ownPlanInUse: boolean;
};

// Default space of a type: the one they chose, else one someone shared with you beats your
// own, so a partner who joined a shared plan lands on it rather than an empty personal one.
export function pickDefaultSpace<
  T extends { role: SpaceRole; isDefault: boolean },
>(spaces: T[]): T | undefined {
  return (
    spaces.find((space) => space.isDefault) ??
    spaces.find((space) => space.role !== "owner") ??
    spaces[0]
  );
}

// The spaces you can add to (editor or owner), default first: the pickers' options and
// what's used when no picker is shown.
export function editableSpaces(
  spaces: { id: string; name: string; role: SpaceRole; isDefault: boolean }[],
): { id: string; name: string }[] {
  const editable = spaces.filter((space) => hasRole(space.role, "editor"));
  const preferred = pickDefaultSpace(editable);
  return (
    preferred
      ? [preferred, ...editable.filter((space) => space !== preferred)]
      : editable
  ).map(({ id, name }) => ({ id, name }));
}
