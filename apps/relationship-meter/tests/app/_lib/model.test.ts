import { describe, expect, it } from "bun:test";
import {
  type ActivityDiversityLevel,
  applyInteraction,
  assignDunbarLayer,
  calculateComprehensiveScore,
  calculateReciprocityState,
  calculateRelationshipDecay,
  type DecayInput,
  type DunbarLayer,
  getHealthStatus,
  type InteractionInput,
  type InterdependenceLevel,
  iosToStrength,
  isContactOverdue,
} from "@/app/_lib/model";

const NOW = new Date("2026-10-02T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function decay(input: Partial<DecayInput> & { daysSinceContact?: number }) {
  const { daysSinceContact = 0, ...rest } = input;
  return calculateRelationshipDecay({
    currentStrength: 80,
    lastInteractionDate: new Date(NOW.getTime() - daysSinceContact * DAY_MS),
    currentDate: NOW,
    category: "nonKin",
    relationshipYears: 2,
    dunbarLayer: "sympathyGroup",
    ...rest,
  });
}

function interact(input: Partial<InteractionInput>) {
  return applyInteraction({
    currentStrength: 50,
    interactionType: "synchronousContact",
    emotionalTone: "positive",
    reciprocityState: "mutual",
    durationMinutes: 30,
    existingContexts: [],
    ...input,
  });
}

const EMPTY_LAYERS: Record<DunbarLayer, number> = {
  supportClique: 0,
  sympathyGroup: 0,
  affinityGroup: 0,
  activeNetwork: 0,
};

describe("calculateRelationshipDecay", () => {
  it("loses nothing on the day of contact", () => {
    const result = decay({ daysSinceContact: 0 });
    expect(result.newStrength).toBe(80);
    expect(result.strengthLost).toBe(0);
  });

  it("treats a relationship with no contact yet as contacted today", () => {
    const result = decay({ lastInteractionDate: null });
    expect(result.daysSinceContact).toBe(0);
    expect(result.newStrength).toBe(80);
  });

  // docs/algorithm.md, Decay Examples
  it("decays a strong friend over 30 days on a 30-day half-life slowed by inertia (example 1)", () => {
    const result = decay({ daysSinceContact: 30 });
    expect(result.decayProfile).toBe("nonKin");
    expect(result.inertiaLevel).toBe("strong");
    expect(result.newStrength).toBe(47.6); // 80 × 0.5^(30 / (30 / 0.75))
  });

  it("decays family far more slowly (example 2)", () => {
    const result = decay({ daysSinceContact: 30, category: "kin" });
    expect(result.decayProfile).toBe("kin");
    expect(result.newStrength).toBe(73.4); // 80 × 0.5^(30 / (180 / 0.75))
  });

  it("moves a friendship of five years or more to the long-term profile", () => {
    expect(decay({ relationshipYears: 4.9 }).decayProfile).toBe("nonKin");
    const longTerm = decay({ relationshipYears: 5, daysSinceContact: 60 });
    expect(longTerm.decayProfile).toBe("longTermNonKin");
    expect(longTerm.newStrength).toBe(47.6); // 80 × 0.5^(60 / (60 / 0.75))
  });

  it("never decays below each profile's floor", () => {
    const years = 10 * 365;
    expect(
      decay({ category: "kin", daysSinceContact: years }).newStrength,
    ).toBe(30);
    expect(decay({ daysSinceContact: years }).newStrength).toBe(0);
    expect(
      decay({ relationshipYears: 8, daysSinceContact: years }).newStrength,
    ).toBe(10);
  });

  it("lets a stronger relationship keep a larger share of its strength", () => {
    const share = (strength: number) =>
      decay({ currentStrength: strength, daysSinceContact: 30 }).newStrength /
      strength;
    expect(share(95)).toBeGreaterThan(share(75));
    expect(share(75)).toBeGreaterThan(share(55));
    expect(share(55)).toBeGreaterThan(share(35));
    expect(share(35)).toBeGreaterThan(share(15));
  });

  it("flags contact as overdue only after the layer's interval", () => {
    expect(decay({ daysSinceContact: 7 }).isOverdue).toBe(false);
    expect(decay({ daysSinceContact: 8 }).isOverdue).toBe(true);
  });

  it("recommends contact more often for a new relationship and less often for family", () => {
    expect(decay({}).recommendedContactDays).toBe(7);
    expect(decay({ relationshipYears: 0.5 }).recommendedContactDays).toBe(4);
    expect(decay({ category: "kin" }).recommendedContactDays).toBe(14);
    expect(
      decay({ category: "kin", relationshipYears: 0.5 }).recommendedContactDays,
    ).toBe(7);
  });

  it("reports the health of the decayed strength", () => {
    expect(decay({ daysSinceContact: 30 }).healthStatus.key).toBe(
      "needsAttention",
    );
  });
});

describe("isContactOverdue", () => {
  it("gives each layer its own interval", () => {
    expect(isContactOverdue(3, "supportClique", "nonKin")).toBe(false);
    expect(isContactOverdue(4, "supportClique", "nonKin")).toBe(true);
    expect(isContactOverdue(30, "activeNetwork", "nonKin")).toBe(false);
    expect(isContactOverdue(31, "activeNetwork", "nonKin")).toBe(true);
  });

  it("gives family twice as long", () => {
    expect(isContactOverdue(14, "sympathyGroup", "kin")).toBe(false);
    expect(isContactOverdue(15, "sympathyGroup", "kin")).toBe(true);
  });
});

describe("getHealthStatus", () => {
  it.each([
    [100, "thriving"],
    [80, "thriving"],
    [79.9, "healthy"],
    [60, "healthy"],
    [40, "needsAttention"],
    [20, "atRisk"],
    [19.9, "dormant"],
    [0, "dormant"],
  ] as const)("%p is %p", (strength, key) => {
    expect(getHealthStatus(strength).key).toBe(key);
  });

  it("carries the label and action to show", () => {
    expect(getHealthStatus(30)).toMatchObject({
      key: "atRisk",
      label: "At risk",
      action: "Reconnect now",
    });
  });
});

describe("iosToStrength", () => {
  it("maps the 1–7 closeness scale onto strength", () => {
    expect(iosToStrength(1)).toBe(15);
    expect(iosToStrength(4)).toBe(60);
    expect(iosToStrength(7)).toBe(100);
  });
});

describe("applyInteraction", () => {
  // docs/algorithm.md, Interaction Examples
  it("multiplies the type's boost by tone, reciprocity and duration (example 1)", () => {
    const result = interact({
      interactionType: "deepConversation",
      durationMinutes: 45,
    });
    expect(result.breakdown).toEqual({
      baseBoost: 25,
      toneModifier: 1,
      reciprocityModifier: 1,
      durationModifier: 1.25,
      finalBoost: 31.3,
    });
    expect(result.newStrength).toBe(81.3);
  });

  it("gives a brief, neutral, one-sided message little (example 2)", () => {
    const result = interact({
      interactionType: "asynchronousContact",
      emotionalTone: "neutral",
      reciprocityState: "oneWayInitiator",
      durationMinutes: 2,
    });
    expect(result.breakdown.finalBoost).toBe(1.4);
  });

  it("lets a negative interaction lower strength (example 3)", () => {
    const result = interact({ emotionalTone: "negative" });
    expect(result.breakdown.finalBoost).toBe(-7.5);
    expect(result.newStrength).toBe(42.5);
    expect(result.strengthChange).toBe(-7.5);
  });

  it("keeps strength between 0 and 100", () => {
    expect(
      interact({ currentStrength: 95, interactionType: "deepConversation" })
        .newStrength,
    ).toBe(100);
    expect(
      interact({ currentStrength: 3, emotionalTone: "negative" }).newStrength,
    ).toBe(0);
  });

  it("counts an interaction with no duration as a short one", () => {
    const result = interact({ durationMinutes: undefined });
    expect(result.breakdown.durationModifier).toBe(0.75);
  });

  it("adds a new context once and grades diversity by how many there are", () => {
    expect(interact({ activityContext: "work" }).newContexts).toEqual(["work"]);
    expect(
      interact({ activityContext: "work", existingContexts: ["work"] })
        .newContexts,
    ).toEqual(["work"]);
    expect(
      interact({ activityContext: undefined, existingContexts: ["work"] })
        .newContexts,
    ).toEqual(["work"]);

    const diversity = (contexts: string[]) =>
      interact({ existingContexts: contexts }).newActivityDiversity;
    expect(diversity(["work"])).toBe("single");
    expect(diversity(["work", "gym"])).toBe("few");
    expect(diversity(["work", "gym", "dinner"])).toBe("few");
    expect(diversity(["work", "gym", "dinner", "travel"])).toBe("diverse");
  });
});

describe("calculateReciprocityState", () => {
  it("keeps the current state with fewer than 3 interactions", () => {
    expect(calculateReciprocityState(2, 2, "oneWayReceiver")).toBe(
      "oneWayReceiver",
    );
    expect(calculateReciprocityState(0, 0, "mutual")).toBe("mutual");
  });

  it.each([
    [10, 10, "oneWayInitiator"],
    [7, 10, "oneWayInitiator"],
    [6, 10, "mutual"],
    [4, 10, "mutual"],
    [3, 10, "oneWayReceiver"],
    [0, 3, "oneWayReceiver"],
  ] as const)("%p of %p initiated by you is %p", (mine, total, state) => {
    expect(calculateReciprocityState(mine, total, "mutual")).toBe(state);
  });
});

describe("assignDunbarLayer", () => {
  it.each([
    [100, "supportClique"],
    [85, "supportClique"],
    [84.9, "sympathyGroup"],
    [65, "sympathyGroup"],
    [40, "affinityGroup"],
    [39.9, "activeNetwork"],
  ] as const)(
    "puts strength %p in %p when every layer has room",
    (strength, layer) => {
      expect(assignDunbarLayer(strength, EMPTY_LAYERS)).toBe(layer);
    },
  );

  it("moves out a layer when the one it qualifies for is full", () => {
    expect(assignDunbarLayer(100, { ...EMPTY_LAYERS, supportClique: 5 })).toBe(
      "sympathyGroup",
    );
    expect(
      assignDunbarLayer(100, {
        ...EMPTY_LAYERS,
        supportClique: 5,
        sympathyGroup: 15,
      }),
    ).toBe("affinityGroup");
  });

  it("never moves a relationship in to a closer layer with room", () => {
    expect(assignDunbarLayer(70, { ...EMPTY_LAYERS, sympathyGroup: 15 })).toBe(
      "affinityGroup",
    );
  });

  it("falls back to the active network when everything is full", () => {
    const full = {
      supportClique: 5,
      sympathyGroup: 15,
      affinityGroup: 50,
      activeNetwork: 150,
    };
    expect(assignDunbarLayer(100, full)).toBe("activeNetwork");
  });
});

describe("calculateComprehensiveScore", () => {
  const diversities: ActivityDiversityLevel[] = ["single", "few", "diverse"];
  const interdependences: InterdependenceLevel[] = [
    "independent",
    "moderate",
    "intertwined",
    "merged",
  ];

  it("closes a share of the gap to 100", () => {
    expect(calculateComprehensiveScore(50, "single", "independent")).toBe(52);
    expect(calculateComprehensiveScore(50, "few", "moderate")).toBe(63);
    expect(calculateComprehensiveScore(50, "diverse", "merged")).toBe(75);
    expect(calculateComprehensiveScore(81, "diverse", "moderate")).toBe(89);
  });

  it("closes at most half the gap, so only 100 shows 100", () => {
    expect(calculateComprehensiveScore(0, "diverse", "merged")).toBe(50);
    expect(calculateComprehensiveScore(98, "diverse", "merged")).toBe(99);
    expect(calculateComprehensiveScore(100, "single", "independent")).toBe(100);
  });

  it("stays between the base strength and 100 and keeps relationships in order", () => {
    for (const diversity of diversities) {
      for (const interdependence of interdependences) {
        let previous = -1;
        for (let base = 0; base <= 100; base += 5) {
          const score = calculateComprehensiveScore(
            base,
            diversity,
            interdependence,
          );
          expect(score).toBeGreaterThanOrEqual(base);
          expect(score).toBeLessThanOrEqual(100);
          expect(score).toBeGreaterThanOrEqual(previous);
          previous = score;
        }
      }
    }
  });
});
