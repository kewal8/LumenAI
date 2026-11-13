export const ORGANISATION_TYPES = [
  "Radiologist practice",
  "Diagnostic or imaging centre",
  "Hospital",
  "Teleradiology provider",
  "Medical college",
  "Other",
] as const;

export const DEMO_STATUSES = ["new", "contacted", "done", "spam"] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_STATUS_LABELS: Record<DemoStatus, string> = {
  new: "New",
  contacted: "Contacted",
  done: "Done",
  spam: "Spam",
};
