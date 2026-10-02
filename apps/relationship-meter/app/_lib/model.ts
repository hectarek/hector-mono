/**
 * Relationship Model - Research-Based Constants and Algorithms
 *
 * Based on relationship science research including:
 * - Granovetter's tie strength theory
 * - Dunbar's social layers
 * - Roberts & Dunbar's maintenance/decay studies
 *
 * @see docs/research.md for full research citations
 */

// =============================================================================
// 1. Granovetter's Tie Strength Factors
// =============================================================================

/**
 * The four factors that define relationship strength according to Granovetter.
 * Each factor contributes equally to overall tie strength.
 */
export const TIE_STRENGTH_FACTORS = {
  timeSpent: 0.25, // Amount of time together
  emotionalIntensity: 0.25, // Depth of feelings/affection
  intimacy: 0.25, // Mutual confiding, trust, vulnerability
  reciprocity: 0.25, // Balanced give-and-take
} as const;

export type TieStrengthFactor = keyof typeof TIE_STRENGTH_FACTORS;

// =============================================================================
// 2. Relationship Categories (by Decay Behavior)
// =============================================================================

/**
 * Research shows two fundamentally different decay patterns.
 * Family bonds are resilient; friendships require active maintenance.
 */
const RELATIONSHIP_CATEGORIES = {
  kin: {
    decayResistance: "high",
    maintenanceCost: "low",
    description: "Relationships with stable, lasting basis (family)",
  },
  nonKin: {
    decayResistance: "low",
    maintenanceCost: "high",
    description: "Relationships that decay without regular contact",
  },
} as const;

export type RelationshipCategory = keyof typeof RELATIONSHIP_CATEGORIES;

// =============================================================================
// 3. Dunbar's Social Layers
// =============================================================================

/**
 * Research-backed capacity limits and time allocation.
 * Emotional closeness is inversely related to layer size.
 */
export const DUNBAR_LAYERS = {
  supportClique: {
    size: 5,
    socialTimeShare: 0.4, // ~40% of social time to top 5
    description: "Closest loved ones, highest emotional investment",
  },
  sympathyGroup: {
    size: 15,
    socialTimeShare: 0.2,
    description: "Close friends you'd turn to in a crisis",
  },
  affinityGroup: {
    size: 50,
    socialTimeShare: 0.2,
    description: "Friends, people you'd invite to a party",
  },
  activeNetwork: {
    size: 150,
    socialTimeShare: 0.2,
    description: "Meaningful contacts, recognize and interact occasionally",
  },
} as const;

export type DunbarLayer = keyof typeof DUNBAR_LAYERS;

// =============================================================================
// 4. Decay Profiles
// =============================================================================

/**
 * Decay follows different patterns based on relationship category.
 * Uses half-life model: time for relationship to lose half its strength without contact.
 */
const DECAY_PROFILES = {
  kin: {
    halfLifeDays: 180, // Takes ~6 months to lose half strength
    minimumFloor: 30, // Never fully decays (biological bond)
  },
  nonKin: {
    halfLifeDays: 30, // Loses half strength in ~1 month without contact
    minimumFloor: 0, // Can fully decay
  },
  longTermNonKin: {
    halfLifeDays: 60, // Slower than new friendships
    minimumFloor: 10, // Some residual bond remains
    thresholdYears: 5, // Friendship > 5 years qualifies
  },
} as const;

export type DecayProfile = keyof typeof DECAY_PROFILES;

// =============================================================================
// 5. Interaction Quality
// =============================================================================

/**
 * Research distinguishes interaction quality - not all contacts are equal.
 * Boosts are in "strength points" (0-100 scale).
 */
export const INTERACTION_QUALITY = {
  deepConversation: {
    strengthBoost: 25,
    intimacyBoost: 20,
    emotionalBoost: 15,
    description: "Personal sharing, emotional support, confiding",
  },
  sharedActivity: {
    strengthBoost: 20,
    intimacyBoost: 10,
    emotionalBoost: 15,
    description: "Doing something together (meal, activity, hangout)",
  },
  synchronousContact: {
    strengthBoost: 15,
    intimacyBoost: 5,
    emotionalBoost: 10,
    description: "Real-time: call, video chat, in-person chat",
  },
  asynchronousContact: {
    strengthBoost: 8,
    intimacyBoost: 2,
    emotionalBoost: 5,
    description: "Messages, emails, comments",
  },
  passiveAcknowledgment: {
    strengthBoost: 3,
    intimacyBoost: 0,
    emotionalBoost: 2,
    description: "Likes, reactions, brief acknowledgment",
  },
} as const;

export type InteractionType = keyof typeof INTERACTION_QUALITY;

// =============================================================================
// 6. Reciprocity States
// =============================================================================

/**
 * Research emphasizes two-way interaction as critical for relationship health.
 * Multiplier affects effective strength of interactions.
 */
const RECIPROCITY_STATES = {
  mutual: {
    healthMultiplier: 1.0,
    description: "Balanced, healthy relationship",
  },
  oneWayInitiator: {
    healthMultiplier: 0.7,
    description: "You're carrying the relationship",
  },
  oneWayReceiver: {
    healthMultiplier: 0.8,
    description: "They're more invested than you",
  },
  dormant: {
    healthMultiplier: 0.5,
    description: "Relationship is fading",
  },
} as const;

export type ReciprocityState = keyof typeof RECIPROCITY_STATES;

// =============================================================================
// 7. Health Status Thresholds
// =============================================================================

/**
 * Based on research patterns of "gradual loss of interest" vs "falling out".
 * Thresholds define health status based on current strength.
 */
export const HEALTH_STATUS = {
  thriving: { min: 80, label: "Thriving", action: "Maintain rhythm" },
  healthy: { min: 60, label: "Healthy", action: "Keep it up" },
  needsAttention: {
    min: 40,
    label: "Needs attention",
    action: "Reach out soon",
  },
  atRisk: { min: 20, label: "At risk", action: "Reconnect now" },
  dormant: { min: 0, label: "Dormant", action: "Major effort needed" },
} as const;

export type HealthStatusKey = keyof typeof HEALTH_STATUS;

export interface HealthStatusInfo {
  key: HealthStatusKey;
  label: string;
  action: string;
}

// =============================================================================
// 8. Recommended Contact Intervals
// =============================================================================

/**
 * Based on decay rates and Dunbar layer expectations.
 * Values are in days between contacts.
 */
const CONTACT_INTERVALS_DAYS = {
  // By Dunbar layer (closer = more frequent)
  supportClique: 3, // Every few days
  sympathyGroup: 7, // Weekly
  affinityGroup: 14, // Bi-weekly
  activeNetwork: 30, // Monthly

  // Modifiers by category
  kinModifier: 2.0, // Family can go 2x longer
  newRelationshipModifier: 0.5, // New relationships need 2x frequency
} as const;

// =============================================================================
// 9. Activity Diversity (RCI Factor)
// =============================================================================

/**
 * Research shows relationships are stronger when people share multiple contexts.
 * The RCI (Relationship Closeness Inventory) includes diversity of shared activities.
 * Multiplier affects overall relationship strength calculations.
 */
const ACTIVITY_DIVERSITY = {
  single: {
    multiplier: 1.0,
    description: "One shared context (e.g., just work)",
  },
  few: {
    multiplier: 1.15,
    description: "2-3 shared contexts",
  },
  diverse: {
    multiplier: 1.3,
    description: "4+ shared contexts (multifaceted relationship)",
  },
} as const;

export type ActivityDiversityLevel = keyof typeof ACTIVITY_DIVERSITY;

// =============================================================================
// 10. Interdependence Levels
// =============================================================================

/**
 * How much you influence each other's decisions and daily life.
 * Research shows interdependence is a hallmark of closeness - partners' lives
 * become interconnected, consulting each other on important decisions.
 */
export const INTERDEPENDENCE_LEVELS = {
  independent: {
    weight: 0.2,
    description: "Lives don't overlap much",
  },
  moderate: {
    weight: 0.5,
    description: "Some shared decisions/activities",
  },
  intertwined: {
    weight: 0.8,
    description: "Significant daily influence",
  },
  merged: {
    weight: 1.0,
    description: "Lives deeply interconnected (partners, close family)",
  },
} as const;

export type InterdependenceLevel = keyof typeof INTERDEPENDENCE_LEVELS;

// =============================================================================
// 11. Emotional Tone
// =============================================================================

/**
 * Research explicitly states that emotional tone matters - frequent conflict
 * or negativity can weaken relational strength despite high contact frequency.
 * Modifier affects the effectiveness of interactions.
 */
export const EMOTIONAL_TONE = {
  positive: {
    strengthModifier: 1.0,
    description: "Supportive, warm, appreciative",
  },
  neutral: {
    strengthModifier: 0.5,
    description: "Transactional, neither warm nor cold",
  },
  mixed: {
    strengthModifier: 0.3,
    description: "Some positive, some conflict",
  },
  negative: {
    strengthModifier: -0.5,
    description: "Conflict, criticism, negativity",
  },
} as const;

export type EmotionalTone = keyof typeof EMOTIONAL_TONE;

// =============================================================================
// 12. Inertia Thresholds (Strength-Based Decay Resistance)
// =============================================================================

/**
 * Research says "higher initial closeness means slower decay."
 * Very close bonds are more resilient to time apart - relationships have inertia.
 * This applies a multiplier to the decay rate based on current strength.
 */
const INERTIA_THRESHOLDS = {
  veryStrong: { minStrength: 90, decayMultiplier: 0.5 }, // Very resistant to decay
  strong: { minStrength: 70, decayMultiplier: 0.75 },
  moderate: { minStrength: 50, decayMultiplier: 1.0 }, // Normal decay rate
  weak: { minStrength: 30, decayMultiplier: 1.25 }, // Slightly faster decay
  veryWeak: { minStrength: 0, decayMultiplier: 1.5 }, // Accelerating decay
} as const;

export type InertiaLevel = keyof typeof INERTIA_THRESHOLDS;

// =============================================================================
// 13. IOS Scale (Inclusion of Other in Self)
// =============================================================================

/**
 * The IOS scale is a validated psychological measure of perceived closeness.
 * Uses 1-7 scale with overlapping circles representing self and other.
 * Maps to 0-100 strength for initial calibration of relationships.
 */
export const IOS_SCALE = {
  1: { strength: 15, label: "Stranger/New acquaintance" },
  2: { strength: 30, label: "Acquaintance" },
  3: { strength: 45, label: "Casual friend" },
  4: { strength: 60, label: "Friend" },
  5: { strength: 75, label: "Good friend" },
  6: { strength: 88, label: "Close friend/Family" },
  7: { strength: 100, label: "Closest bond" },
} as const;

export type IOSLevel = keyof typeof IOS_SCALE;

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Determine which Dunbar layer a relationship should belong to based on
 * emotional closeness score and current layer occupancy.
 *
 * @param emotionalCloseness - Score 0-100 indicating how close the relationship is
 * @param currentLayerCounts - Current count of relationships in each layer
 * @returns The appropriate Dunbar layer
 */
export function assignDunbarLayer(
  emotionalCloseness: number,
  currentLayerCounts: Record<DunbarLayer, number>,
): DunbarLayer {
  // Thresholds based on closeness score
  const layerThresholds: { layer: DunbarLayer; minCloseness: number }[] = [
    { layer: "supportClique", minCloseness: 85 },
    { layer: "sympathyGroup", minCloseness: 65 },
    { layer: "affinityGroup", minCloseness: 40 },
    { layer: "activeNetwork", minCloseness: 0 },
  ];

  for (const { layer, minCloseness } of layerThresholds) {
    if (emotionalCloseness >= minCloseness) {
      // Check if layer has capacity
      const layerConfig = DUNBAR_LAYERS[layer];
      if (currentLayerCounts[layer] < layerConfig.size) {
        return layer;
      }
      // Layer full, try next layer down
    }
  }

  // Default to active network (outer layer)
  return "activeNetwork";
}

/**
 * Get health status and recommended action based on current strength.
 *
 * @param strength - Current relationship strength (0-100)
 * @returns Health status information including key, label, and recommended action
 */
export function getHealthStatus(strength: number): HealthStatusInfo {
  if (strength >= HEALTH_STATUS.thriving.min) {
    return { key: "thriving", ...HEALTH_STATUS.thriving };
  }
  if (strength >= HEALTH_STATUS.healthy.min) {
    return { key: "healthy", ...HEALTH_STATUS.healthy };
  }
  if (strength >= HEALTH_STATUS.needsAttention.min) {
    return { key: "needsAttention", ...HEALTH_STATUS.needsAttention };
  }
  if (strength >= HEALTH_STATUS.atRisk.min) {
    return { key: "atRisk", ...HEALTH_STATUS.atRisk };
  }
  return { key: "dormant", ...HEALTH_STATUS.dormant };
}

/**
 * Check if contact is overdue based on Dunbar layer and relationship category.
 *
 * @param daysSinceContact - Days since last interaction
 * @param dunbarLayer - The relationship's Dunbar layer
 * @param category - Whether the relationship is kin or non-kin
 * @returns True if contact is overdue
 */
export function isContactOverdue(
  daysSinceContact: number,
  dunbarLayer: DunbarLayer,
  category: RelationshipCategory,
): boolean {
  const baseInterval = CONTACT_INTERVALS_DAYS[dunbarLayer];
  const modifier =
    category === "kin" ? CONTACT_INTERVALS_DAYS.kinModifier : 1.0;

  const adjustedInterval = baseInterval * modifier;
  return daysSinceContact > adjustedInterval;
}

/**
 * Get the recommended contact interval for a relationship.
 *
 * @param dunbarLayer - The relationship's Dunbar layer
 * @param category - Whether the relationship is kin or non-kin
 * @param isNewRelationship - Whether this is a recently formed relationship
 * @returns Recommended days between contacts
 */
function getRecommendedContactInterval(
  dunbarLayer: DunbarLayer,
  category: RelationshipCategory,
  isNewRelationship = false,
): number {
  const baseInterval = CONTACT_INTERVALS_DAYS[dunbarLayer];

  let modifier = 1.0;
  if (category === "kin") {
    modifier *= CONTACT_INTERVALS_DAYS.kinModifier;
  }
  if (isNewRelationship) {
    modifier *= CONTACT_INTERVALS_DAYS.newRelationshipModifier;
  }

  return Math.round(baseInterval * modifier);
}

/**
 * Determine decay profile based on relationship category and duration.
 *
 * @param category - Whether the relationship is kin or non-kin
 * @param relationshipYears - How many years the relationship has existed
 * @returns The appropriate decay profile
 */
function getDecayProfile(
  category: RelationshipCategory,
  relationshipYears: number,
): DecayProfile {
  if (category === "kin") {
    return "kin";
  }
  if (relationshipYears >= DECAY_PROFILES.longTermNonKin.thresholdYears) {
    return "longTermNonKin";
  }
  return "nonKin";
}

// =============================================================================
// Enhanced Functions (Research2 additions)
// =============================================================================

/**
 * Get the inertia level based on current strength.
 * Higher strength = more resistant to decay.
 *
 * @param currentStrength - Current relationship strength (0-100)
 * @returns The inertia level key
 */
function getInertiaLevel(currentStrength: number): InertiaLevel {
  if (currentStrength >= INERTIA_THRESHOLDS.veryStrong.minStrength) {
    return "veryStrong";
  }
  if (currentStrength >= INERTIA_THRESHOLDS.strong.minStrength) {
    return "strong";
  }
  if (currentStrength >= INERTIA_THRESHOLDS.moderate.minStrength) {
    return "moderate";
  }
  if (currentStrength >= INERTIA_THRESHOLDS.weak.minStrength) {
    return "weak";
  }
  return "veryWeak";
}

/**
 * Get the activity diversity multiplier based on number of shared contexts.
 *
 * @param sharedContextCount - Number of different contexts/activities shared
 * @returns The diversity level and its multiplier
 */
function getActivityDiversityMultiplier(sharedContextCount: number): {
  level: ActivityDiversityLevel;
  multiplier: number;
} {
  if (sharedContextCount >= 4) {
    return {
      level: "diverse",
      multiplier: ACTIVITY_DIVERSITY.diverse.multiplier,
    };
  }
  if (sharedContextCount >= 2) {
    return { level: "few", multiplier: ACTIVITY_DIVERSITY.few.multiplier };
  }
  return { level: "single", multiplier: ACTIVITY_DIVERSITY.single.multiplier };
}

/**
 * Get interdependence weight for relationship strength calculations.
 *
 * @param level - The interdependence level
 * @returns Weight value between 0.2 and 1.0
 */
export function getInterdependenceWeight(level: InterdependenceLevel): number {
  return INTERDEPENDENCE_LEVELS[level].weight;
}

/**
 * Convert IOS scale (1-7) to initial strength (0-100).
 * Useful for onboarding when users rate how close they feel to someone.
 *
 * @param iosLevel - IOS scale value (1-7)
 * @returns Initial strength value (0-100)
 */
export function iosToStrength(iosLevel: IOSLevel): number {
  return IOS_SCALE[iosLevel].strength;
}

/**
 * Calculate comprehensive relationship score incorporating multiple factors.
 * Combines base strength with activity diversity and interdependence.
 *
 * @param baseStrength - Current raw strength (0-100)
 * @param activityDiversity - Level of activity diversity
 * @param interdependence - Level of interdependence
 * @returns Adjusted relationship score (capped at 100)
 */
export function calculateComprehensiveScore(
  baseStrength: number,
  activityDiversity: ActivityDiversityLevel,
  interdependence: InterdependenceLevel,
): number {
  const diversityMultiplier = ACTIVITY_DIVERSITY[activityDiversity].multiplier;
  const interdependenceWeight = INTERDEPENDENCE_LEVELS[interdependence].weight;

  // Activity diversity boosts the score
  // Interdependence adds weighted bonus (max +20 points at full interdependence)
  const diversityBoost = baseStrength * (diversityMultiplier - 1);
  const interdependenceBonus = 20 * interdependenceWeight;

  const score = baseStrength + diversityBoost + interdependenceBonus;
  return Math.min(100, Math.round(score));
}

// =============================================================================
// Unified Algorithm Functions
// =============================================================================

/**
 * Input for the unified decay calculation.
 */
export interface DecayInput {
  currentStrength: number;
  lastInteractionDate: Date | null;
  currentDate: Date;
  category: RelationshipCategory;
  relationshipYears: number;
  dunbarLayer: DunbarLayer;
}

/**
 * Result of the unified decay calculation.
 */
export interface DecayResult {
  newStrength: number;
  strengthLost: number;
  decayProfile: DecayProfile;
  inertiaLevel: InertiaLevel;
  daysSinceContact: number;
  isOverdue: boolean;
  healthStatus: HealthStatusInfo;
  recommendedContactDays: number;
}

/**
 * Unified decay calculation that combines all research-based factors:
 * - Category-based decay profiles (kin vs nonKin vs longTermNonKin)
 * - Strength-based inertia (strong relationships resist decay)
 * - Dunbar layer expectations
 *
 * @param input - All parameters needed for decay calculation
 * @returns Comprehensive decay result with diagnostics
 */
export function calculateRelationshipDecay(input: DecayInput): DecayResult {
  const {
    currentStrength,
    lastInteractionDate,
    currentDate,
    category,
    relationshipYears,
    dunbarLayer,
  } = input;

  // Step 1: Calculate days since last contact
  const daysSinceContact = lastInteractionDate
    ? Math.floor(
        (currentDate.getTime() - lastInteractionDate.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  // Step 2: Determine decay profile based on category and relationship duration
  const decayProfile = getDecayProfile(category, relationshipYears);
  const profile = DECAY_PROFILES[decayProfile];

  // Step 3: Get inertia multiplier based on current strength
  const inertiaLevel = getInertiaLevel(currentStrength);
  const inertiaMultiplier = INERTIA_THRESHOLDS[inertiaLevel].decayMultiplier;

  // Step 4: Calculate adjusted half-life (inertia slows/speeds decay)
  const adjustedHalfLife = profile.halfLifeDays / inertiaMultiplier;

  // Step 5: Apply exponential decay formula
  const decayFactor = 0.5 ** (daysSinceContact / adjustedHalfLife);
  const decayedStrength = currentStrength * decayFactor;

  // Step 6: Apply minimum floor
  const newStrength = Math.max(
    Math.round(decayedStrength * 10) / 10,
    profile.minimumFloor,
  );
  const strengthLost = currentStrength - newStrength;

  // Step 7: Check if contact is overdue
  const isOverdue = isContactOverdue(daysSinceContact, dunbarLayer, category);

  // Step 8: Get health status
  const healthStatus = getHealthStatus(newStrength);

  // Step 9: Get recommended contact interval
  const recommendedContactDays = getRecommendedContactInterval(
    dunbarLayer,
    category,
    relationshipYears < 1,
  );

  return {
    newStrength,
    strengthLost,
    decayProfile,
    inertiaLevel,
    daysSinceContact,
    isOverdue,
    healthStatus,
    recommendedContactDays,
  };
}

/**
 * Duration multiplier constants for interaction boost.
 * Research shows longer interactions are more impactful.
 */
const DURATION_MULTIPLIERS = {
  brief: { maxMinutes: 5, multiplier: 0.5 },
  short: { maxMinutes: 15, multiplier: 0.75 },
  medium: { maxMinutes: 30, multiplier: 1.0 },
  long: { maxMinutes: 60, multiplier: 1.25 },
  extended: { maxMinutes: Infinity, multiplier: 1.5 },
} as const;

/**
 * Get duration multiplier based on interaction length.
 */
function getDurationMultiplier(durationMinutes: number): number {
  if (durationMinutes <= DURATION_MULTIPLIERS.brief.maxMinutes) {
    return DURATION_MULTIPLIERS.brief.multiplier;
  }
  if (durationMinutes <= DURATION_MULTIPLIERS.short.maxMinutes) {
    return DURATION_MULTIPLIERS.short.multiplier;
  }
  if (durationMinutes <= DURATION_MULTIPLIERS.medium.maxMinutes) {
    return DURATION_MULTIPLIERS.medium.multiplier;
  }
  if (durationMinutes <= DURATION_MULTIPLIERS.long.maxMinutes) {
    return DURATION_MULTIPLIERS.long.multiplier;
  }
  return DURATION_MULTIPLIERS.extended.multiplier;
}

/**
 * Input for applying an interaction.
 */
export interface InteractionInput {
  currentStrength: number;
  interactionType: InteractionType;
  emotionalTone: EmotionalTone;
  reciprocityState: ReciprocityState;
  durationMinutes?: number;
  activityContext?: string;
  existingContexts: string[];
}

/**
 * Result of applying an interaction.
 */
export interface InteractionResult {
  newStrength: number;
  strengthChange: number;
  newReciprocityState: ReciprocityState;
  newActivityDiversity: ActivityDiversityLevel;
  newContexts: string[];
  breakdown: {
    baseBoost: number;
    toneModifier: number;
    reciprocityModifier: number;
    durationModifier: number;
    finalBoost: number;
  };
}

/**
 * Calculate new reciprocity state based on interaction history.
 * Tracks recent interactions to determine if relationship effort is balanced.
 *
 * @param recentUserInitiatedCount - How many of recent interactions user initiated
 * @param recentTotalCount - Total recent interactions to consider
 * @returns The appropriate reciprocity state
 */
export function calculateReciprocityState(
  recentUserInitiatedCount: number,
  recentTotalCount: number,
): ReciprocityState {
  if (recentTotalCount < 3) {
    // Not enough data, assume mutual
    return "mutual";
  }

  if (recentTotalCount === 0) {
    return "dormant";
  }

  const userRatio = recentUserInitiatedCount / recentTotalCount;

  if (userRatio >= 0.7) {
    return "oneWayInitiator"; // User initiates 70%+ of interactions
  }
  if (userRatio <= 0.3) {
    return "oneWayReceiver"; // User initiates 30% or less
  }
  return "mutual"; // Balanced (30-70% range)
}

/**
 * Apply an interaction to a relationship, calculating new strength
 * and updating related metrics.
 *
 * Factors applied:
 * - Base boost from interaction type
 * - Emotional tone modifier (+100% to -50%)
 * - Reciprocity health modifier
 * - Duration multiplier (longer = more impactful)
 *
 * @param input - All parameters for the interaction
 * @returns New state and detailed breakdown
 */
export function applyInteraction(input: InteractionInput): InteractionResult {
  const {
    currentStrength,
    interactionType,
    emotionalTone,
    reciprocityState,
    durationMinutes = 15, // Default to short interaction
    activityContext,
    existingContexts,
  } = input;

  // Step 1: Get base boost from interaction type
  const interaction = INTERACTION_QUALITY[interactionType];
  const baseBoost = interaction.strengthBoost;

  // Step 2: Apply emotional tone modifier
  const tone = EMOTIONAL_TONE[emotionalTone];
  const toneModifier = tone.strengthModifier;

  // Step 3: Apply reciprocity modifier
  const reciprocity = RECIPROCITY_STATES[reciprocityState];
  const reciprocityModifier = reciprocity.healthMultiplier;

  // Step 4: Apply duration modifier
  const durationModifier = getDurationMultiplier(durationMinutes);

  // Step 5: Calculate final boost
  const finalBoost =
    baseBoost * toneModifier * reciprocityModifier * durationModifier;

  // Step 6: Apply to current strength (cap at 100, floor at 0)
  const newStrength = Math.min(100, Math.max(0, currentStrength + finalBoost));
  const strengthChange = newStrength - currentStrength;

  // Step 7: Update activity contexts if new context provided
  const newContexts = [...existingContexts];
  if (activityContext && !existingContexts.includes(activityContext)) {
    newContexts.push(activityContext);
  }

  // Step 8: Calculate new activity diversity
  const { level: newActivityDiversity } = getActivityDiversityMultiplier(
    newContexts.length,
  );

  // Step 9: Reciprocity state update is simplified here
  // In real usage, you'd track recent interactions and call calculateReciprocityState
  const newReciprocityState = reciprocityState;

  return {
    newStrength: Math.round(newStrength * 10) / 10,
    strengthChange: Math.round(strengthChange * 10) / 10,
    newReciprocityState,
    newActivityDiversity,
    newContexts,
    breakdown: {
      baseBoost,
      toneModifier,
      reciprocityModifier,
      durationModifier,
      finalBoost: Math.round(finalBoost * 10) / 10,
    },
  };
}
