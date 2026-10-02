"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";
import { useMemo } from "react";
import { RelationshipCard } from "@/app/_components/relationship-card";
import type { LogInteraction, Relationship } from "@/app/_lib/types";

interface RelationshipListProps {
  relationships: Relationship[];
  onInteraction: LogInteraction;
  onEdit: (id: number, updates: Partial<Relationship>) => void;
  isGrouped: boolean;
}

const categoryLabels: Record<Relationship["type"], string> = {
  family: "Family",
  significant_other: "Significant Other",
  friend: "Friend",
  acquaintance: "Acquaintance",
  colleague: "Colleague",
};

const categoryOrder: Relationship["type"][] = [
  "family",
  "significant_other",
  "friend",
  "acquaintance",
  "colleague",
];

export function RelationshipList({
  relationships,
  onInteraction,
  onEdit,
  isGrouped,
}: RelationshipListProps) {
  const groupedRelationships = useMemo(() => {
    const groups: Record<Relationship["type"], Relationship[]> = {
      family: [],
      significant_other: [],
      friend: [],
      acquaintance: [],
      colleague: [],
    };

    for (const relationship of relationships) {
      if (groups[relationship.type]) {
        groups[relationship.type].push(relationship);
      }
    }

    return groups;
  }, [relationships]);

  if (!isGrouped) {
    return (
      <div className="space-y-4">
        {relationships.map((relationship) => (
          <RelationshipCard
            key={relationship.id}
            relationship={relationship}
            onInteraction={onInteraction}
            onEdit={onEdit}
          />
        ))}
      </div>
    );
  }

  return (
    <Accordion>
      {categoryOrder.map((type) => (
        <AccordionItem value={type} key={type}>
          <AccordionTrigger>{categoryLabels[type]}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              {groupedRelationships[type].map((relationship) => (
                <RelationshipCard
                  key={relationship.id}
                  relationship={relationship}
                  onInteraction={onInteraction}
                  onEdit={onEdit}
                />
              ))}
              {groupedRelationships[type].length === 0 && (
                <p className="text-sm text-muted-foreground py-2">
                  No relationships in this category.
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
