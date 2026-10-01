"use client";

import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";
import {
  Heart,
  History,
  MessageCircle,
  Phone,
  ThumbsUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  type EmotionalTone,
  INTERACTION_QUALITY,
  type InteractionType,
} from "@/app/_lib/model";
import type { Interaction } from "@/app/_lib/types";
import { formatRelativeTime } from "@/app/_lib/utils";

interface InteractionHistoryProps {
  relationshipName: string;
  interactions: Interaction[];
}

const interactionIcons: Record<InteractionType, React.ElementType> = {
  deepConversation: Heart,
  sharedActivity: Users,
  synchronousContact: Phone,
  asynchronousContact: MessageCircle,
  passiveAcknowledgment: ThumbsUp,
};

// A tone's dot inside its badge, from the theme's status tokens; the word says it too.
const toneDots: Record<EmotionalTone, string> = {
  positive: "bg-success",
  neutral: "bg-muted-foreground",
  mixed: "bg-warning",
  negative: "bg-destructive",
};

export function InteractionHistory({
  relationshipName,
  interactions,
}: InteractionHistoryProps) {
  const [open, setOpen] = useState(false);

  // Calculate summary stats
  const totalInteractions = interactions.length;
  const userInitiated = interactions.filter((i) => i.initiatedByUser).length;
  const reciprocityRatio =
    totalInteractions > 0 ? (userInitiated / totalInteractions) * 100 : 50;

  const toneCounts = interactions.reduce(
    (acc, i) => {
      const tone = i.emotionalTone ?? "positive";
      acc[tone] = (acc[tone] || 0) + 1;
      return acc;
    },
    {} as Record<EmotionalTone, number>,
  );

  const sortedInteractions = [...interactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <History className="size-4" />
        History
        {totalInteractions > 0 && (
          <Badge variant="secondary" className="ml-1">
            {totalInteractions}
          </Badge>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Interaction History</DialogTitle>
          <DialogDescription>
            Past interactions with {relationshipName}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalInteractions}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.round(reciprocityRatio)}%
            </div>
            <div className="text-xs text-muted-foreground">You Initiated</div>
          </div>
          <div className="text-center">
            <div className="text-success text-2xl font-bold">
              {toneCounts.positive || 0}
            </div>
            <div className="text-xs text-muted-foreground">Positive</div>
          </div>
        </div>

        {/* Interaction List */}
        {sortedInteractions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No interactions recorded yet.
          </div>
        ) : (
          <ScrollArea className="h-75">
            <div className="space-y-3 pr-4">
              {sortedInteractions.map((interaction) => {
                const Icon = interactionIcons[interaction.type];
                const interactionConfig = INTERACTION_QUALITY[interaction.type];
                const tone = interaction.emotionalTone ?? "positive";

                return (
                  <div
                    key={interaction.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="p-2 rounded-full bg-background">
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {interactionConfig.description}
                        </span>
                        <Badge variant="outline">
                          <span
                            aria-hidden
                            className={cn(
                              "size-2 rounded-full",
                              toneDots[tone],
                            )}
                          />
                          {tone}
                        </Badge>
                        {interaction.initiatedByUser ? (
                          <Badge variant="outline">You</Badge>
                        ) : (
                          <Badge variant="outline">Them</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(interaction.date)}</span>
                        {interaction.durationMinutes && (
                          <span>• {interaction.durationMinutes} min</span>
                        )}
                        {interaction.activityContext && (
                          <span>• {interaction.activityContext}</span>
                        )}
                      </div>
                      {interaction.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {interaction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
