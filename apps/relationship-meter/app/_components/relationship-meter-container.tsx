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
  calculateRelationshipDecay,
  type DunbarLayer,
  type EmotionalTone,
  getHealthStatus,
  type InteractionType,
  type IOSLevel,
  iosToStrength,
  isContactOverdue,
} from "@/app/_lib/model";
import type { Interaction, Relationship } from "@/app/_lib/types";
import { TYPE_TO_CATEGORY } from "@/app/_lib/types";
import { getDaysSinceContact, getRelationshipYears } from "@/app/_lib/utils";

/**
 * Calculate the display strength with decay applied.
 */
function getDisplayStrength(relationship: Relationship): number {
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

  const handleInteraction = (
    id: number,
    interactionType: InteractionType,
    emotionalTone: EmotionalTone = "positive",
    durationMinutes = 15,
    activityContext?: string,
  ) => {
    setRelationships((prevRelationships) =>
      prevRelationships.map((relationship) => {
        if (relationship.id !== id) return relationship;

        const result = applyInteraction({
          currentStrength: getDisplayStrength(relationship),
          interactionType,
          emotionalTone,
          reciprocityState: relationship.reciprocity ?? "mutual",
          durationMinutes,
          activityContext,
          existingContexts: relationship.sharedContexts ?? [],
        });

        const newInteraction: Interaction = {
          id: crypto.randomUUID(),
          date: new Date(),
          type: interactionType,
          initiatedByUser: true,
          emotionalTone,
          durationMinutes,
          activityContext,
        };

        return {
          ...relationship,
          strength: result.newStrength,
          lastInteraction: new Date(),
          interactions: [...(relationship.interactions ?? []), newInteraction],
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

    // Auto-assign Dunbar layer based on strength if not provided
    let assignedLayer: DunbarLayer = dunbarLayer ?? "activeNetwork";
    if (!dunbarLayer) {
      if (strength >= 85) assignedLayer = "supportClique";
      else if (strength >= 65) assignedLayer = "sympathyGroup";
      else if (strength >= 40) assignedLayer = "affinityGroup";
      else assignedLayer = "activeNetwork";
    }

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
