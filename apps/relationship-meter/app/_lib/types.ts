import type {
  ActivityDiversityLevel,
  DunbarLayer,
  EmotionalTone,
  InteractionType,
  InterdependenceLevel,
  IOSLevel,
  ReciprocityState,
  RelationshipCategory,
} from "./model";

/**
 * User-facing relationship type labels.
 * These map to the research-based RelationshipCategory for decay calculations.
 */
export type RelationshipType =
  | "family" // → kin
  | "significant_other" // → kin (treated as closest bond)
  | "friend" // → nonKin
  | "acquaintance" // → nonKin
  | "colleague"; // → nonKin

/**
 * Maps user-facing relationship types to research-based categories.
 */
export const TYPE_TO_CATEGORY: Record<RelationshipType, RelationshipCategory> =
  {
    family: "kin",
    significant_other: "kin",
    friend: "nonKin",
    acquaintance: "nonKin",
    colleague: "nonKin",
  };

/**
 * A logged interaction with a relationship.
 */
export interface Interaction {
  id: string;
  date: Date;
  type: InteractionType;
  initiatedByUser: boolean; // For reciprocity tracking
  emotionalTone?: EmotionalTone; // Quality of the interaction
  durationMinutes?: number; // How long the interaction lasted (longer = more impactful)
  activityContext?: string; // Which context this occurred in (for diversity tracking)
  notes?: string;
}

/**
 * Core relationship model aligned with research findings.
 *
 * Migration notes:
 * - `maintenanceLevel` is deprecated, replaced by `dunbarLayer` + category-based calculations
 * - New fields (`dunbarLayer`, `reciprocity`, `lastInteraction`, `createdAt`) enable
 *   research-based decay and health tracking
 */
export interface Relationship {
  id: number;
  name: string;
  imageUrl?: string;

  // Type (maps to kin/nonKin category via TYPE_TO_CATEGORY)
  type: RelationshipType;

  // Current state (0-100 scale)
  strength: number;

  // === Legacy field (deprecated) ===
  /** @deprecated Use dunbarLayer + category-based calculations instead */
  maintenanceLevel?: "low" | "medium" | "high";

  // === New research-based fields (optional during migration) ===

  /** Dunbar layer - determines contact frequency expectations */
  dunbarLayer?: DunbarLayer;

  /** Reciprocity state - tracks balance of initiation */
  reciprocity?: ReciprocityState;

  /** When the last interaction occurred */
  lastInteraction?: Date | null;

  /** When relationship was added to app */
  createdAt?: Date;

  /** When the relationship actually started (for longTermNonKin decay profile) */
  relationshipStartDate?: Date;

  /** User's initial closeness assessment using IOS scale (1-7) */
  initialIosRating?: IOSLevel;

  /** Interaction history for detailed tracking */
  interactions?: Interaction[];

  // === Research2 additions ===

  /** Activity diversity - how many contexts you share (work, hobbies, etc.) */
  activityDiversity?: ActivityDiversityLevel;

  /** Interdependence - how much you influence each other's lives */
  interdependence?: InterdependenceLevel;

  /** Shared activity contexts for tracking diversity */
  sharedContexts?: string[];
}
