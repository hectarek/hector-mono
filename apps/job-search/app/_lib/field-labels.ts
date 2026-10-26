// Inputs as the screens and tools name them, and a record's history names its fields: one list,
// which validation messages (app/actions/shared.ts), forms and histories share. Anything not
// listed (a hidden id) is never named in a message: no one sees it, so a code name would only
// confuse. Each unit adds its own.
export const FIELD_LABELS: Record<string, string> = {
  // list_activity's filters
  record: "Record",
  actor: "Actor",
  since: "Since",
  until: "Until",
  limit: "Limit",
  offset: "Offset",
  // A company's facts (a lead source's name is `name` too), and find_companies' query
  name: "Name",
  website: "Website",
  location: "Location",
  headcount: "Headcount",
  industry: "Industry",
  officePolicy: "Office policy",
  leavePolicy: "Leave policy",
  tier: "Tier",
  researchSummary: "Research summary",
  researchRef: "Research notes",
  query: "Search",
  // The settings: a weekly target per count, and the queue cap
  messagesSent: "Messages sent",
  conversationsHeld: "Conversations held",
  applications: "Applications",
  practiceSessions: "Practice sessions",
  screensReached: "Moves to screen or beyond",
  pendingCap: "Queue cap",
};

// A field's label, or its name in words ("nextStep" is "Next step"): a history names every field
// a change touched, listed or not.
export function fieldLabel(field: string): string {
  const words = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return FIELD_LABELS[field] ?? words.charAt(0).toUpperCase() + words.slice(1);
}
