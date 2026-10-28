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
  // A job's facts, where it stands and Hector's review, as inputs and its history name them
  // (`company` and `source` are the history's names for the two)
  companyId: "Company",
  company: "Company",
  clientName: "Client",
  role: "Role",
  status: "Status",
  nextStep: "Next step",
  nextDate: "Next date",
  appliedOn: "Applied on",
  targetRole: "Target role",
  level: "Level",
  workMode: "Work mode",
  payMin: "Pay from",
  payMax: "Pay to",
  postingUrl: "Posting link",
  summary: "Summary",
  foundOn: "Found on",
  source: "Source",
  travelPercent: "Travel (%)",
  employmentType: "Employment type",
  teamSize: "Team size",
  reviewState: "Review",
  proposalReason: "Claude's reason",
  dismissReason: "Dismissed because",
  dismissNote: "Dismissal note",
  // A status move's date and a closing's reason, a proposal's reason, and a dismissal's note
  on: "Date",
  reason: "Reason",
  note: "Note",
  // A note's text
  body: "Note",
  // A person's facts (their `name`, `role`, `nextStep` and `nextDate` are above), and a job's
  // contacts as its history names them
  howKnown: "Known from",
  rank: "Rank",
  ask: "The ask",
  notes: "Notes",
  contact: "Contact",
  contactFor: "Contact for",
  // An interaction, as log_interaction and the quick-log sheet take it
  personIds: "People",
  person: "Person",
  kind: "What happened",
  occurredOn: "Date",
  jobId: "Job",
  scheduled: "Time",
  conversationId: "Conversation",
  outcome: "How it went",
  state: "State",
  // A practice session and a review, as log_practice and the practice forms take them, and a
  // review's session and step as its history names them (`notes` is above)
  sessionId: "Session",
  session: "Session",
  step: "Review",
  topic: "Problem or topic",
  type: "Type",
  pattern: "Pattern",
  practicedOn: "Date",
  result: "Result",
  aiUsed: "AI used",
  minutes: "Minutes",
};

// A field's label, or its name in words ("nextStep" is "Next step"): a history names every field
// a change touched, listed or not.
export function fieldLabel(field: string): string {
  const words = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return FIELD_LABELS[field] ?? words.charAt(0).toUpperCase() + words.slice(1);
}
