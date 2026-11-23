import type { NightDetails } from "@/app/actions/nights";
import { addDays } from "@/src/entities/week";
import type { NightSwitches } from "./night-form";

// A new night's fields before anything is typed (D5): tomorrow at 7 PM with no end, six seats,
// for the host's friends. A plain module, since the page works it out on the server, and a server
// component can't call a function a "use client" module exports.
export function newNightStart(today: string): NightDetails & NightSwitches {
  return {
    name: "",
    date: addDays(today, 1),
    startsAt: "19:00",
    endsAt: null,
    place: "",
    address: "",
    note: "",
    capacity: 6,
    audience: "friends",
    attendeesCanInvite: false,
    guestsAllowed: false,
  };
}
