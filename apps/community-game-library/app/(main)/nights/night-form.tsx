"use client";

import { Button } from "@repo/ui/components/button";
import { ButtonGroup } from "@repo/ui/components/button-group";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Switch } from "@repo/ui/components/switch";
import { Textarea } from "@repo/ui/components/textarea";
import { useRouter } from "next/navigation";
import { type ReactNode, useId, useState, useTransition } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { DayField } from "@/app/_components/day-field";
import { Group } from "@/app/_components/group";
import { CloseIcon, MinusIcon, PlusIcon } from "@/app/_components/icons";
import { SavedSwitch } from "@/app/_components/saved-switch";
import { callResultAction } from "@/app/_lib/call-action";
import { useLeaveGuard } from "@/app/_lib/leave-guard";
import { notify } from "@/app/_lib/notify";
import {
  createNight,
  type NightDetails,
  setNightSwitch,
  updateNight,
} from "@/app/actions/nights";
import type { ActionState } from "@/app/actions/shared";
import { cardLine } from "@/src/entities/game-facts";
import { coverColorOf } from "@/src/entities/piece";
import { type NightGameChoices, PickGamesSheet } from "./pick-games-sheet";

export type NightSwitches = {
  attendeesCanInvite: boolean;
  guestsAllowed: boolean;
};

// The seats a night can have: the host and at least one more, up to a big party.
const FEWEST_SEATS = 2;
const MOST_SEATS = 99;

const optional = (
  <span data-ink="smudge" className="font-normal">
    {" · optional"}
  </span>
);

// Every half hour of the day, as the time fields offer them: "19:00" reads "7:00 PM".
const HALF_HOURS = Array.from({ length: 48 }, (_, slot) => {
  const hours = Math.floor(slot / 2);
  const minutes = slot % 2 === 0 ? "00" : "30";
  return `${String(hours).padStart(2, "0")}:${minutes}`;
});

function clockWords(time: string): string {
  const [hours = 0, minutes = "00"] = [
    Number(time.slice(0, 2)),
    time.slice(3, 5),
  ];
  return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}

// The half hours, with a time that isn't one of them (an edited night's) in its place.
const timesWith = (time: string | null) =>
  time === null || HALF_HOURS.includes(time)
    ? HALF_HOURS
    : [...HALF_HOURS, time].sort();

// A switch that waits for the form's Create (a new night doesn't exist yet to save to), laid out
// as SavedSwitch is, with its label beside it.
function FormSwitch({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const switchId = useId();
  const helpId = useId();
  return (
    <div className="flex min-h-11 items-center justify-between gap-2.5">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={switchId} className="text-15">
          {label}
        </label>
        <p id={helpId} className="text-xs leading-snug text-muted-foreground">
          {help}
        </p>
      </div>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={onChange}
        aria-describedby={helpId}
      />
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Field data-invalid={error ? "true" : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint && <FieldDescription>{hint}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}

const SWITCHES = {
  attendeesCanInvite: {
    label: "People going can invite others",
    help: "Off: only you invite.",
    which: "attendees-can-invite",
  },
  guestsAllowed: {
    label: "People can bring guests",
    help: "Guests don’t need the app. Each takes a seat.",
    which: "guests-allowed",
  },
} as const;

// New game night (D5, R29, R30, R47), and the host's Edit with the same fields: when and where,
// the seats counting the host, who sees it, the two switches, and on a new night the games on the
// table, picked from the host's library (D6). Create goes on to the night's page, or to Invite
// people for a night only invited people see (screens.md, Create a game night). On Edit each
// switch saves as it's flipped (rule 4), Save changes saves the rest and goes back to the night,
// and everyone going is told when its time, place or words changed.
export function NightForm({
  today,
  start,
  choices,
  edit,
}: {
  today: string;
  start: NightDetails & NightSwitches;
  // New game night: the host's copies for D6.
  choices?: NightGameChoices;
  // Edit: the night, and the people going, for the message saying who's told.
  edit?: {
    gameNightId: string;
    going: { userId: string; name: string }[];
  };
}) {
  const router = useRouter();
  const ids = useId();
  const { attendeesCanInvite, guestsAllowed, ...startDetails } = start;
  const [details, setDetails] = useState<NightDetails>(startDetails);
  const [switches, setSwitches] = useState<NightSwitches>({
    attendeesCanInvite,
    guestsAllowed,
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const fields = state?.fields;
  const change = (next: Partial<NightDetails>) =>
    setDetails((now) => ({ ...now, ...next }));
  const changed =
    JSON.stringify(details) !== JSON.stringify(startDetails) ||
    picked.length > 0;
  useLeaveGuard(changed && !sent);

  const send = () => {
    startTransition(async () => {
      const result = await callResultAction(() =>
        edit
          ? updateNight(edit.gameNightId, details, edit.going)
          : createNight({ ...details, ...switches, userGameIds: picked }),
      );
      if (result && "href" in result) {
        setSent(true);
        router.push(result.href);
        notify(result.message);
        return;
      }
      setState(result && "ok" in result ? { error: result.error } : result);
    });
  };

  const onTable = (choices ?? []).filter((one) =>
    picked.includes(one.userGameId),
  );

  return (
    <form
      className="flex flex-col gap-3.5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <Group label="When and where">
        <TextField id={`${ids}-name`} label="Name" error={fields?.name}>
          <Input
            id={`${ids}-name`}
            value={details.name}
            onChange={(event) => change({ name: event.target.value })}
            aria-invalid={fields?.name ? true : undefined}
          />
        </TextField>
        <DayField
          id={`${ids}-date`}
          label="Date"
          today={today}
          from={today}
          value={details.date}
          onChange={(date) => change({ date })}
        />
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <TextField
              id={`${ids}-starts`}
              label="Starts"
              error={fields?.startsAt}
            >
              <NativeSelect
                id={`${ids}-starts`}
                className="w-full"
                value={details.startsAt}
                onChange={(event) => change({ startsAt: event.target.value })}
              >
                {timesWith(details.startsAt).map((time) => (
                  <NativeSelectOption key={time} value={time}>
                    {clockWords(time)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </TextField>
          </div>
          <div className="min-w-0 flex-1">
            <TextField
              id={`${ids}-ends`}
              label={<span>Ends{optional}</span>}
              error={fields?.endsAt}
            >
              <NativeSelect
                id={`${ids}-ends`}
                className="w-full"
                value={details.endsAt ?? ""}
                onChange={(event) =>
                  change({ endsAt: event.target.value || null })
                }
              >
                <NativeSelectOption value="">No end time</NativeSelectOption>
                {timesWith(details.endsAt).map((time) => (
                  <NativeSelectOption key={time} value={time}>
                    {clockWords(time)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </TextField>
          </div>
        </div>
        <TextField
          id={`${ids}-place`}
          label="Place"
          hint="What guests will read."
          error={fields?.place}
        >
          <Input
            id={`${ids}-place`}
            value={details.place}
            onChange={(event) => change({ place: event.target.value })}
            aria-invalid={fields?.place ? true : undefined}
          />
        </TextField>
        <TextField
          id={`${ids}-address`}
          label={<span>Address{optional}</span>}
          hint="Only people who can see the night see this."
          error={fields?.address}
        >
          <Input
            id={`${ids}-address`}
            value={details.address}
            autoComplete="street-address"
            onChange={(event) => change({ address: event.target.value })}
          />
        </TextField>
        <TextField
          id={`${ids}-note`}
          label={<span>Note{optional}</span>}
          error={fields?.note}
        >
          <Textarea
            id={`${ids}-note`}
            value={details.note}
            onChange={(event) => change({ note: event.target.value })}
          />
        </TextField>
      </Group>

      <Group label="Seats">
        <div className="flex flex-col gap-1.5">
          <ButtonGroup aria-label="Seats">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="One seat fewer"
              disabled={details.capacity <= FEWEST_SEATS}
              onClick={() => change({ capacity: details.capacity - 1 })}
            >
              <MinusIcon />
            </Button>
            <output
              aria-live="polite"
              className="flex h-11 w-14 items-center justify-center border-y-2 border-foreground bg-secondary font-mono text-lg font-medium"
            >
              {details.capacity}
            </output>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="One seat more"
              disabled={details.capacity >= MOST_SEATS}
              onClick={() => change({ capacity: details.capacity + 1 })}
            >
              <PlusIcon />
            </Button>
          </ButtonGroup>
          <p className="text-xs text-muted-foreground">
            How many people can come, counting you. Guests count too.
          </p>
          {fields?.capacity && (
            <p role="alert" className="text-xs text-destructive">
              {fields.capacity}
            </p>
          )}
        </div>
      </Group>

      <Group label="Who sees it">
        <RadioGroup
          aria-label="Who sees it"
          value={details.audience}
          onValueChange={(next) =>
            change({ audience: next === "invited" ? "invited" : "friends" })
          }
        >
          {(
            [
              [
                "friends",
                "My friends",
                "Any friend can join while there’s room.",
              ],
              [
                "invited",
                "Only people I invite",
                "By name, or with the night’s link.",
              ],
            ] as const
          ).map(([value, words, help]) => (
            <div key={value} className="flex items-start gap-2.5 py-1">
              <RadioGroupItem
                id={`${ids}-${value}`}
                value={value}
                className="mt-0.5"
              />
              <label
                htmlFor={`${ids}-${value}`}
                className="flex flex-1 flex-col gap-0.5"
              >
                <span className="text-15">{words}</span>
                <span className="text-xs text-muted-foreground">{help}</span>
              </label>
            </div>
          ))}
        </RadioGroup>
      </Group>

      <Group label="Guests and invites">
        {(["attendeesCanInvite", "guestsAllowed"] as const).map((key) =>
          edit ? (
            <SavedSwitch
              key={key}
              label={SWITCHES[key].label}
              help={SWITCHES[key].help}
              on={switches[key]}
              save={setNightSwitch.bind(
                null,
                edit.gameNightId,
                SWITCHES[key].which,
              )}
            />
          ) : (
            <FormSwitch
              key={key}
              label={SWITCHES[key].label}
              help={SWITCHES[key].help}
              checked={switches[key]}
              onChange={(on) => setSwitches((now) => ({ ...now, [key]: on }))}
            />
          ),
        )}
      </Group>

      {choices && (
        <Group label="Games on the table">
          {onTable.length > 0 && (
            <ul className="flex flex-col *:border-dashed *:border-foreground *:not-first:border-t-2">
              {onTable.map(({ userGameId, game }) => (
                <li key={userGameId} className="flex items-center gap-3 py-2">
                  <CoverThumb
                    color={coverColorOf(game)}
                    imageUrl={game.imageUrl}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-15 font-bold">{game.title}</span>
                    <span className="font-mono text-2xs font-medium text-muted-foreground">
                      {cardLine(game)}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${game.title}`}
                    onClick={() =>
                      setPicked((now) => now.filter((id) => id !== userGameId))
                    }
                  >
                    <CloseIcon />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="secondary"
            className="self-start"
            onClick={() => setPicking(true)}
          >
            <PlusIcon data-icon="inline-start" />
            Pick from my library
          </Button>
          <PickGamesSheet
            open={picking}
            onOpenChange={setPicking}
            choices={choices}
            picked={picked}
            onDone={setPicked}
          />
        </Group>
      )}

      <div className="flex flex-col gap-1.5">
        {state?.error && !fields && (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {edit
            ? "Save changes"
            : details.audience === "invited"
              ? "Create and invite people"
              : "Create game night"}
        </Button>
      </div>
    </form>
  );
}
