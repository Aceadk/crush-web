'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
} from '@crush/ui';
import { DiscoveryFilters, DEFAULT_DISCOVERY_FILTERS } from '@crush/core';
import { MapPin, Users, Shield, Image } from 'lucide-react';

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: DiscoveryFilters;
  onApplyFilters: (filters: DiscoveryFilters) => void;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'non-binary', label: 'Non-binary' },
];

export function FilterDialog({
  open,
  onOpenChange,
  filters,
  onApplyFilters,
}: FilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<DiscoveryFilters>(filters);

  // Sync local state when filters prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_DISCOVERY_FILTERS);
  };

  const toggleGender = (gender: string) => {
    const currentGenders = localFilters.genders || [];
    const newGenders = currentGenders.includes(gender)
      ? currentGenders.filter((g) => g !== gender)
      : [...currentGenders, gender];
    setLocalFilters({ ...localFilters, genders: newGenders });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Discovery Filters</DialogTitle>
          <DialogDescription>
            Adjust your preferences to find better matches
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Age Range */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Age Range
              </label>
              <span className="text-sm text-muted-foreground">
                {localFilters.minAge} - {localFilters.maxAge}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-8">Min</span>
                <input
                  type="range"
                  min="18"
                  max="70"
                  value={localFilters.minAge}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      minAge: Math.min(Number(e.target.value), localFilters.maxAge - 1),
                    })
                  }
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm w-8 text-right">{localFilters.minAge}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground w-8">Max</span>
                <input
                  type="range"
                  min="18"
                  max="70"
                  value={localFilters.maxAge}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      maxAge: Math.max(Number(e.target.value), localFilters.minAge + 1),
                    })
                  }
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <span className="text-sm w-8 text-right">{localFilters.maxAge}</span>
              </div>
            </div>
          </div>

          {/* Distance */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                Maximum Distance
              </label>
              <span className="text-sm text-muted-foreground">
                {localFilters.maxDistance} km
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="200"
              value={localFilters.maxDistance}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  maxDistance: Number(e.target.value),
                })
              }
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1 km</span>
              <span>200 km</span>
            </div>
          </div>

          {/* Show Me */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Show Me</label>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleGender(option.value)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    localFilters.genders?.includes(option.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Filters */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Additional Filters</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                <input
                  type="checkbox"
                  checked={localFilters.hasPhotos ?? false}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      hasPhotos: e.target.checked || undefined,
                    })
                  }
                  className="w-5 h-5 rounded accent-primary"
                />
                <Image className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Only show profiles with photos</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors">
                <input
                  type="checkbox"
                  checked={localFilters.isVerified ?? false}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      isVerified: e.target.checked || undefined,
                    })
                  }
                  className="w-5 h-5 rounded accent-primary"
                />
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Only show verified profiles</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
