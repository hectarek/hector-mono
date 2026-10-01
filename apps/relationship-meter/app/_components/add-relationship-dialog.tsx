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
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  DUNBAR_LAYERS,
  type DunbarLayer,
  IOS_SCALE,
  type IOSLevel,
} from "@/app/_lib/model";
import type { Relationship } from "@/app/_lib/types";

interface AddRelationshipDialogProps {
  onAdd: (
    name: string,
    type: Relationship["type"],
    initialIosRating: IOSLevel,
    dunbarLayer?: DunbarLayer,
  ) => void;
}

export function AddRelationshipDialog({ onAdd }: AddRelationshipDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<Relationship["type"]>("friend");
  const [iosRating, setIosRating] = useState<IOSLevel>(4);
  const [dunbarLayer, setDunbarLayer] = useState<DunbarLayer | "">("");

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim(), type, iosRating, dunbarLayer || undefined);
      setName("");
      setType("friend");
      setIosRating(4);
      setDunbarLayer("");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> Add Relationship
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Relationship</DialogTitle>
          <DialogDescription>
            Add a new person to track your relationship health with.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="add-name">Name</Label>
            <Input
              id="add-name"
              placeholder="Enter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-type">Relationship Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as Relationship["type"])}
            >
              <SelectTrigger id="add-type">
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
            <Label htmlFor="add-closeness">How close do you feel?</Label>
            <Select
              value={iosRating.toString()}
              onValueChange={(value) => setIosRating(Number(value) as IOSLevel)}
            >
              <SelectTrigger id="add-closeness">
                <SelectValue placeholder="Select closeness level" />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(IOS_SCALE) as [
                    string,
                    { strength: number; label: string },
                  ][]
                ).map(([level, config]) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <span>{config.label}</span>
                      <span className="text-muted-foreground text-xs">
                        ({config.strength}%)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-layer">Priority Level (optional)</Label>
            <Select
              value={dunbarLayer}
              onValueChange={(value) => setDunbarLayer(value as DunbarLayer)}
            >
              <SelectTrigger id="add-layer">
                <SelectValue placeholder="Auto-assign based on closeness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-assign</SelectItem>
                {(
                  Object.entries(DUNBAR_LAYERS) as [
                    DunbarLayer,
                    { size: number; description: string },
                  ][]
                ).map(([layer, config]) => (
                  <SelectItem key={layer} value={layer}>
                    <div className="flex items-center gap-2">
                      <span>{config.description}</span>
                      <span className="text-muted-foreground text-xs">
                        (max {config.size})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
