"use client";

import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
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
import { ArrowUpDown } from "lucide-react";
import { HEALTH_STATUS, type HealthStatusKey } from "@/app/_lib/model";

export type StatusFilter = HealthStatusKey | "all" | "overdue";

interface SortFilterControlsProps {
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (value: string) => void;
  filterText: string;
  onFilterChange: (value: string) => void;
  sortOptions: { value: string; label: string }[];
  isGrouped: boolean;
  onGroupToggle: () => void;
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (value: StatusFilter) => void;
}

export function SortFilterControls({
  sortBy,
  sortOrder,
  onSortChange,
  filterText,
  onFilterChange,
  sortOptions,
  isGrouped,
  onGroupToggle,
  statusFilter = "all",
  onStatusFilterChange,
}: SortFilterControlsProps) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="filter">Search</Label>
              <Input
                id="filter"
                placeholder="Search relationships..."
                value={filterText}
                onChange={(e) => onFilterChange(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={sortBy}
                  onValueChange={(value) => value && onSortChange(value)}
                >
                  <SelectTrigger id="sort">
                    <SelectValue placeholder="Select sorting option" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => onSortChange(sortBy)}
                >
                  <ArrowUpDown
                    className={`size-4 transition-transform ${sortOrder === "desc" ? "rotate-180" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            {onStatusFilterChange && (
              <div className="flex-1 space-y-2">
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    value && onStatusFilterChange(value as StatusFilter)
                  }
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Relationships</SelectItem>
                    <SelectItem value="overdue">Overdue Only</SelectItem>
                    {(
                      Object.entries(HEALTH_STATUS) as [
                        HealthStatusKey,
                        (typeof HEALTH_STATUS)[HealthStatusKey],
                      ][]
                    ).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex-1 space-y-2">
              <Label htmlFor="group-toggle">Group by Type</Label>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  id="group-toggle"
                  checked={isGrouped}
                  onCheckedChange={onGroupToggle}
                />
                <span className="text-sm font-medium">
                  {isGrouped ? "Grouped" : "Ungrouped"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
