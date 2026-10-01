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
import { Edit } from "lucide-react";
import { useState } from "react";
import {
  DUNBAR_LAYERS,
  type DunbarLayer,
  INTERDEPENDENCE_LEVELS,
  type InterdependenceLevel,
} from "@/app/_lib/model";
import type { Relationship } from "@/app/_lib/types";
import { getDunbarLayerLabel } from "@/app/_lib/utils";

interface EditDialogProps {
  relationship: Relationship;
  onEdit: (id: number, updates: Partial<Relationship>) => void;
}

export function EditDialog({ relationship, onEdit }: EditDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(relationship.name);
  const [type, setType] = useState<Relationship["type"]>(relationship.type);
  const [dunbarLayer, setDunbarLayer] = useState<DunbarLayer>(
    relationship.dunbarLayer ?? "activeNetwork",
  );
  const [interdependence, setInterdependence] = useState<InterdependenceLevel>(
    relationship.interdependence ?? "independent",
  );

  const handleSubmit = () => {
    if (name.trim()) {
      onEdit(relationship.id, {
        name: name.trim(),
        type,
        dunbarLayer,
        interdependence,
      });
      setOpen(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setName(relationship.name);
      setType(relationship.type);
      setDunbarLayer(relationship.dunbarLayer ?? "activeNetwork");
      setInterdependence(relationship.interdependence ?? "independent");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="icon-sm" variant="outline" />}>
        <Edit className="size-4" />
        <span className="sr-only">Edit relationship</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Relationship</DialogTitle>
          <DialogDescription>
            Update the details for {relationship.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-type">Relationship Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as Relationship["type"])}
            >
              <SelectTrigger id="edit-type">
                <SelectValue placeholder="Select relationship type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="significant_other">
                  Significant Other
                </SelectItem>
                <SelectItem value="friend">Friend</SelectItem>
                <SelectItem value="acquaintance">Acquaintance</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-layer">Priority Level</Label>
            <Select
              value={dunbarLayer}
              onValueChange={(value) => setDunbarLayer(value as DunbarLayer)}
            >
              <SelectTrigger id="edit-layer">
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(DUNBAR_LAYERS) as [
                    DunbarLayer,
                    { size: number; description: string },
                  ][]
                ).map(([layer, config]) => (
                  <SelectItem key={layer} value={layer}>
                    <div className="flex items-center gap-2">
                      <span>{getDunbarLayerLabel(layer)}</span>
                      <span className="text-muted-foreground text-xs">
                        ({config.description})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-interdependence">Interdependence</Label>
            <Select
              value={interdependence}
              onValueChange={(value) =>
                setInterdependence(value as InterdependenceLevel)
              }
            >
              <SelectTrigger id="edit-interdependence">
                <SelectValue placeholder="Select interdependence level" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(INTERDEPENDENCE_LEVELS) as [
                    InterdependenceLevel,
                    { weight: number; description: string },
                  ][]
                ).map(([level, config]) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{level}</span>
                      <span className="text-muted-foreground text-xs">
                        ({config.description})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {relationship.sharedContexts &&
            relationship.sharedContexts.length > 0 && (
              <div className="space-y-2">
                <Label>Activity Contexts</Label>
                <div className="flex flex-wrap gap-1">
                  {relationship.sharedContexts.map((context) => (
                    <span
                      key={context}
                      className="text-xs bg-muted px-2 py-1 rounded"
                    >
                      {context}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
