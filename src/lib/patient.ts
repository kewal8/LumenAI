import { parseModality } from "./templateDoc";

export const AGE_UNITS = ["Years", "Months", "Days"] as const;
export const SEXES = ["Male", "Female", "Other"] as const;

export type AgeUnit = (typeof AGE_UNITS)[number];
export type Sex = (typeof SEXES)[number];

/** Who and what a report is for. Asked for when the report is first saved. */
export type Patient = {
  name: string;
  age: number | null;
  ageUnit: AgeUnit;
  sex: Sex | null;
  study: string;
  modality: string | null;
};

export const EMPTY_PATIENT: Patient = { name: "", age: null, ageUnit: "Years", sex: null, study: "", modality: null };

/** True once the details needed to save have been given. */
export function hasPatient(patient: Patient | null | undefined): patient is Patient {
  return Boolean(patient?.name.trim());
}

/** "54 Y · M": the short form shown beside the name. */
export function ageSex(patient: Patient) {
  const age = patient.age === null ? "" : `${patient.age} ${patient.ageUnit[0]}`;
  const sex = patient.sex ? patient.sex[0] : "";
  return [age, sex].filter(Boolean).join(" · ");
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Checks patient details sent with a report. Returns the cleaned details, null when none were sent, or a message. */
export function parsePatient(value: unknown): Patient | null | string {
  if (value === undefined || value === null) return null;
  const input = value as Record<string, unknown>;
  const name = text(input.name, 120);
  if (!name) return "Enter the patient's name.";
  let age: number | null = null;
  if (input.age !== null && input.age !== undefined && input.age !== "") {
    age = Number(input.age);
    if (!Number.isInteger(age) || age < 0 || age > 150) return "Enter the age as a whole number.";
  }
  const ageUnit = AGE_UNITS.find((unit) => unit === input.ageUnit) ?? "Years";
  const sex = SEXES.find((option) => option === input.sex) ?? null;
  return { name, age, ageUnit, sex, study: text(input.study, 160), modality: parseModality(input.modality) };
}

/** Reads the patient columns of a reports row. */
export function patientFromRow(row: Record<string, unknown>): Patient | null {
  if (typeof row.patient_name !== "string" || !row.patient_name) return null;
  return {
    name: row.patient_name,
    age: typeof row.patient_age === "number" ? row.patient_age : null,
    ageUnit: AGE_UNITS.find((unit) => unit === row.patient_age_unit) ?? "Years",
    sex: SEXES.find((option) => option === row.patient_sex) ?? null,
    study: typeof row.study === "string" ? row.study : "",
    modality: typeof row.modality === "string" ? row.modality : null,
  };
}
