"use client";

import { SettingsCard } from "@neondatabase/auth/react";
import { Field, FieldLabel, FieldTitle } from "@repo/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { useTheme } from "@repo/ui/components/theme-provider";
import { Monitor, Moon, Sun } from "lucide-react";
import { useId, useSyncExternalStore } from "react";

const MODES = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

const noSubscription = () => () => {};

// Neon's SettingsCard, so it matches the account cards it sits under.
export function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  // The choice is saved in localStorage, so the server can't know it: select nothing
  // until hydrated, or the server and client HTML disagree.
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const id = useId();

  return (
    <SettingsCard
      title="Appearance"
      description="Light or dark, or match your device's setting."
      instructions="Saved on this device."
    >
      {/* px-6 matches the padding of Neon's own card content. */}
      <div className="px-6">
        {/* Stacked at every width: the card sits in Neon's narrow column, so three across
            leaves each option too narrow for its radio. */}
        <RadioGroup
          aria-label="Appearance"
          value={hydrated ? (theme ?? null) : null}
          onValueChange={(value) => setTheme(String(value))}
        >
          {MODES.map(({ value, label, Icon }) => (
            <FieldLabel key={value} htmlFor={`${id}-${value}`}>
              <Field orientation="horizontal">
                <FieldTitle>
                  <Icon aria-hidden className="size-4" />
                  {label}
                </FieldTitle>
                <RadioGroupItem value={value} id={`${id}-${value}`} />
              </Field>
            </FieldLabel>
          ))}
        </RadioGroup>
      </div>
    </SettingsCard>
  );
}
