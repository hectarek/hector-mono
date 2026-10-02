"use client";

import { useMemo, useState } from "react";
import { AddRelationshipDialog } from "@/app/_components/add-relationship-dialog";
import { Header } from "@/app/_components/header";
import { RelationshipList } from "@/app/_components/relationship-list";
import {
  SortFilterControls,
  type StatusFilter,
} from "@/app/_components/sort-filter-controls";
import { initialRelationships } from "@/app/_lib/data";
import {
  applyInteraction,
  assignDunbarLayer,
  calculateComprehensiveScore,
  calculateReciprocityState,
  calculateRelationshipDecay,
  type DunbarLayer,
  getHealthStatus,
  type IOSLevel,
  iosToStrength,
  isContactOverdue,
  RECIPROCITY_WINDOW,
} from "@/app/_lib/model";
import type {
  Interaction,
  InteractionEntry,
  Relationship,
} from "@/app/_lib/types";
import { TYPE_TO_CATEGORY } from "@/app/_lib/types";
import { getDaysSinceContact, getRelationshipYears } from "@/app/_lib/utils";

/**
 * The stored strength with decay applied: what an interaction builds on.
 */
function getDecayedStrength(relationship: Relationship): number {
  if (!relationship.lastInteraction) return relationship.strength;

  const result = calculateRelationshipDecay({
    currentStrength: relationship.strength,
    lastInteractionDate: relationship.lastInteraction,
    currentDate: new Date(),
    category: TYPE_TO_CATEGORY[relationship.type],
    relationshipYears: getRelationshipYears(relationship),
    dunbarLayer: relationship.dunbarLayer ?? "activeNetwork",
  });

  return result.newStrength;
}

/**
 * The strength shown, sorted and filtered on: decay, then shared contexts and
 * interdependence. Kept out of the stored strength so the bonus never compounds.
 */
function getDisplayStrength(relationship: Relationship): number {
  return calculateComprehensiveScore(
    getDecayedStrength(relationship),
    relationship.activityDiversity ?? "single",
    relationship.interdependence ?? "independent",
  );
}

export function RelationshipMeterContainer() {
  const [relationships, setRelationships] =
    useState<Relationship[]>(initialRelationships);
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isGrouped, setIsGrouped] = useState(true);

  // Calculate display strengths with decay applied
  const relationshipsWithDecay = useMemo(() => {
    return relationships.map((r) => ({
      ...r,
      strength: getDisplayStrength(r),
    }));
  }, [relationships]);

  const handleInteraction = (id: number, entry: InteractionEntry) => {
    setRelationships((prevRelationships) =>
      prevRelationships.map((relationship) => {
        if (relationship.id !== id) return relationship;

        const newInteraction: Interaction = {
          ...entry,
          id: crypto.randomUUID(),
          date: new Date(),
        };
        const interactions = [
          ...(relationship.interactions ?? []),
          newInteraction,
        ];

        // This interaction counts toward the balance it's then boosted by.
        const recent = interactions.slice(-RECIPROCITY_WINDOW);
        const reciprocity = calculateReciprocityState(
          recent.filter((interaction) => interaction.initiatedByUser).length,
          recent.length,
          relationship.reciprocity ?? "mutual",
        );

        const result = applyInteraction({
          currentStrength: getDecayedStrength(relationship),
          interactionType: entry.type,
          emotionalTone: entry.emotionalTone ?? "positive",
          reciprocityState: reciprocity,
          durationMinutes: entry.durationMinutes,
          activityContext: entry.activityContext,
          existingContexts: relationship.sharedContexts ?? [],
        });

        return {
          ...relationship,
          strength: result.newStrength,
          reciprocity,
          lastInteraction: newInteraction.date,
          interactions,
          sharedContexts: result.newContexts,
          activityDiversity: result.newActivityDiversity,
        };
      }),
    );
  };

  const handleAddRelationship = (
    name: string,
    type: Relationship["type"],
    initialIosRating: IOSLevel = 4,
    dunbarLayer?: DunbarLayer,
  ) => {
    const newId = Math.max(...relationships.map((r) => r.id), 0) + 1;
    const strength = iosToStrength(initialIosRating);

    // Without a chosen layer, the closest one the strength qualifies for that still has room.
    const layerCounts: Record<DunbarLayer, number> = {
      supportClique: 0,
      sympathyGroup: 0,
      affinityGroup: 0,
      activeNetwork: 0,
    };
    for (const relationship of relationships) {
      layerCounts[relationship.dunbarLayer ?? "activeNetwork"] += 1;
    }
    const assignedLayer =
      dunbarLayer ?? assignDunbarLayer(strength, layerCounts);

    const newRelationship: Relationship = {
      id: newId,
      name,
      type,
      strength,
      dunbarLayer: assignedLayer,
      reciprocity: "mutual",
      lastInteraction: new Date(),
      createdAt: new Date(),
      initialIosRating,
      activityDiversity: "single",
      interdependence: "independent",
      sharedContexts: [],
      interactions: [],
    };

    setRelationships([...relationships, newRelationship]);
  };

  const handleEditRelationship = (
    id: number,
    updates: Partial<Relationship>,
  ) => {
    setRelationships((prevRelationships) =>
      prevRelationships.map((relationship) =>
        relationship.id === id ? { ...relationship, ...updates } : relationship,
      ),
    );
  };

  const filteredAndSortedRelationships = useMemo(() => {
    return relationshipsWithDecay
      .filter((relationship) => {
        // Text filter
        if (
          !relationship.name.toLowerCase().includes(filterText.toLowerCase())
        ) {
          return false;
        }

        // Status filter
        if (statusFilter !== "all") {
          const healthStatus = getHealthStatus(relationship.strength);
          const daysSince = getDaysSinceContact(relationship.lastInteraction);
          const dunbarLayer = relationship.dunbarLayer ?? "activeNetwork";
          const category = TYPE_TO_CATEGORY[relationship.type];
          const overdue = isContactOverdue(daysSince, dunbarLayer, category);

          if (statusFilter === "overdue") {
            return overdue;
          }
          return healthStatus.key === statusFilter;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") {
          return sortOrder === "asc"
            ? a.name.localeCompare(b.name)
            : b.name.localeCompare(a.name);
        }
        if (sortBy === "strength") {
          return sortOrder === "asc"
            ? a.strength - b.strength
            : b.strength - a.strength;
        }
        if (sortBy === "lastInteraction") {
          const aDate = a.lastInteraction?.getTime() ?? 0;
          const bDate = b.lastInteraction?.getTime() ?? 0;
          return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
        }
        if (sortBy === "daysSinceContact") {
          const aDays = getDaysSinceContact(a.lastInteraction);
          const bDays = getDaysSinceContact(b.lastInteraction);
          return sortOrder === "asc" ? aDays - bDays : bDays - aDays;
        }
        return 0;
      });
  }, [relationshipsWithDecay, filterText, statusFilter, sortBy, sortOrder]);

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("asc");
    }
  };

  return (
    <div className="min-h-svh py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Header />
        <div className="flex justify-end">
          <AddRelationshipDialog onAdd={handleAddRelationship} />
        </div>
        <SortFilterControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          filterText={filterText}
          onFilterChange={setFilterText}
          isGrouped={isGrouped}
          onGroupToggle={() => setIsGrouped(!isGrouped)}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          sortOptions={[
            { value: "name", label: "Name" },
            { value: "strength", label: "Strength" },
            { value: "lastInteraction", label: "Last Interaction" },
            { value: "daysSinceContact", label: "Days Since Contact" },
          ]}
        />
        <RelationshipList
          relationships={filteredAndSortedRelationships}
          onInteraction={handleInteraction}
          onEdit={handleEditRelationship}
          isGrouped={isGrouped}
        />
      </div>
    </div>
  );
}
