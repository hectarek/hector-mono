"use client";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import {
  Heart,
  MessageCircle,
  Phone,
  Plus,
  ThumbsUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  EMOTIONAL_TONE,
  type EmotionalTone,
  INTERACTION_QUALITY,
  type InteractionType,
} from "@/app/_lib/model";
import type { LogInteraction } from "@/app/_lib/types";

interface InteractionDialogProps {
  relationshipId: number;
  relationshipName: string;
  onInteraction: LogInteraction;
}

const interactionIcons: Record<InteractionType, React.ElementType> = {
  deepConversation: Heart,
  sharedActivity: Users,
  synchronousContact: Phone,
  asynchronousContact: MessageCircle,
  passiveAcknowledgment: ThumbsUp,
};

const durationPresets = [
  { value: 5, label: "Brief (5 min)" },
  { value: 15, label: "Short (15 min)" },
  { value: 30, label: "Medium (30 min)" },
  { value: 60, label: "Long (1 hr)" },
  { value: 120, label: "Extended (2+ hr)" },
];

export function InteractionDialog({
  relationshipId,
  relationshipName,
  onInteraction,
}: InteractionDialogProps) {
  const [open, setOpen] = useState(false);
  const [interactionType, setInteractionType] = useState<InteractionType | "">(
    "",
  );
  const [emotionalTone, setEmotionalTone] = useState<EmotionalTone>("positive");
  const [duration, setDuration] = useState(15);
  const [initiatedByUser, setInitiatedByUser] = useState(true);
  const [activityContext, setActivityContext] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (interactionType) {
      onInteraction(relationshipId, {
        type: interactionType,
        initiatedByUser,
        emotionalTone,
        durationMinutes: duration,
        activityContext: activityContext || undefined,
        notes: notes || undefined,
      });
      // Reset form
      setInteractionType("");
      setEmotionalTone("positive");
      setDuration(15);
      setInitiatedByUser(true);
      setActivityContext("");
      setNotes("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" /> Interact
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Interaction</DialogTitle>
          <DialogDescription>
            Record an interaction with {relationshipName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Interaction Type */}
          <div className="space-y-2">
            <Label htmlFor="interaction-type">What did you do?</Label>
            <Select
              value={interactionType}
              onValueChange={(value) =>
                value && setInteractionType(value as InteractionType)
              }
            >
              <SelectTrigger id="interaction-type">
                <SelectValue placeholder="Select interaction type" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(INTERACTION_QUALITY) as [
                    InteractionType,
                    (typeof INTERACTION_QUALITY)[InteractionType],
                  ][]
                ).map(([type, config]) => {
                  const Icon = interactionIcons[type];
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="size-4" />
                        <span>{config.description}</span>
                        <span className="text-muted-foreground text-xs">
                          +{config.strengthBoost}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Emotional Tone */}
          <div className="space-y-2">
            <Label htmlFor="emotional-tone">How was it?</Label>
            <Select
              value={emotionalTone}
              onValueChange={(value) =>
                value && setEmotionalTone(value as EmotionalTone)
              }
            >
              <SelectTrigger id="emotional-tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(EMOTIONAL_TONE) as [
                    EmotionalTone,
                    (typeof EMOTIONAL_TONE)[EmotionalTone],
                  ][]
                ).map(([tone, config]) => (
                  <SelectItem key={tone} value={tone}>
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{tone}</span>
                      <span className="text-muted-foreground text-xs">
                        ({config.description})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">How long?</Label>
            <Select
              value={duration.toString()}
              onValueChange={(value) => value && setDuration(Number(value))}
            >
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {durationPresets.map((preset) => (
                  <SelectItem
                    key={preset.value}
                    value={preset.value.toString()}
                  >
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Who Initiated */}
          <div className="flex items-center justify-between">
            <Label htmlFor="initiated">You initiated?</Label>
            <Switch
              id="initiated"
              checked={initiatedByUser}
              onCheckedChange={setInitiatedByUser}
            />
          </div>

          {/* Activity Context */}
          <div className="space-y-2">
            <Label htmlFor="context">Context (optional)</Label>
            <Input
              id="context"
              placeholder="e.g., work, gym, dinner"
              value={activityContext}
              onChange={(e) => setActivityContext(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any details about this interaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!interactionType}>
            Log Interaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
