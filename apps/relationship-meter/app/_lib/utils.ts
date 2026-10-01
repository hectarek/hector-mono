import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  type DunbarLayer,
  getHealthStatus,
  type HealthStatusKey,
} from "@/app/_lib/model";
import type { Relationship } from "@/app/_lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get color based on health status (derived from strength).
 */
export function getStatusColor(strength: number): string {
  const status = getHealthStatus(strength);
  const colors: Record<HealthStatusKey, string> = {
    thriving: "green",
    healthy: "blue",
    needsAttention: "yellow",
    atRisk: "orange",
    dormant: "red",
  };
  return colors[status.key];
}

/**
 * Get status text based on strength using research-based thresholds.
 */
export function getStatusText(strength: number): string {
  const status = getHealthStatus(strength);
  return status.label;
}

/**
 * Get icon name for relationship type.
 */
export function getRelationshipIcon(type: Relationship["type"]): string {
  switch (type) {
    case "family":
      return "Users";
    case "significant_other":
      return "Heart";
    case "friend":
      return "User";
    case "acquaintance":
      return "UserPlus";
    case "colleague":
      return "Briefcase";
  }
}

/**
 * Get human-readable label for Dunbar layer.
 */
export function getDunbarLayerLabel(layer: DunbarLayer): string {
  const labels: Record<DunbarLayer, string> = {
    supportClique: "Inner Circle",
    sympathyGroup: "Close Friends",
    affinityGroup: "Friends",
    activeNetwork: "Acquaintances",
  };
  return labels[layer];
}

/**
 * Format relative time (e.g., "3 days ago").
 */
export function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Calculate years since relationship started.
 */
export function getRelationshipYears(relationship: Relationship): number {
  const startDate =
    relationship.relationshipStartDate ?? relationship.createdAt;
  if (!startDate) return 0;

  const now = new Date();
  const diffMs = now.getTime() - new Date(startDate).getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 365);
}

/**
 * Calculate days since last interaction.
 */
export function getDaysSinceContact(
  lastInteraction: Date | null | undefined,
): number {
  if (!lastInteraction) return 0;

  const now = new Date();
  const diffMs = now.getTime() - new Date(lastInteraction).getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
