export type TemplateLine = { id: string; text: string };

export type TemplateSection = {
  id: string;
  heading: string;
  lines: TemplateLine[];
};

export type Template = {
  id: string;
  name: string;
  title: string;
  sections: TemplateSection[];
  normalImpression: string[];
  /** The template's own page, tagged with these line ids. A new report starts from it. */
  doc?: unknown;
  /** The study type it is for, such as CT; suggested for a new report's details. */
  modality?: string | null;
};

export type ReportLine = {
  id: string;
  text: string;
  // normal: untouched template wording. spoken: written from a dictation.
  // edited: typed by the radiologist.
  status: "normal" | "spoken" | "edited";
  source?: string;
  warnings: string[];
};

export type ReportSection = {
  id: string;
  heading: string;
  lines: ReportLine[];
};

/** One dictation that was written into the report, kept as its history. */
export type LogEntry = {
  id: string;
  /** ISO time the report was updated. */
  at: string;
  /** "unchanged": the words were heard but nothing in the report needed to change. */
  kind: "created" | "updated" | "unchanged";
  /** What was said, as the doctor meant it: self-corrections applied, false starts dropped. */
  dictation: string;
  /** The exact words heard, kept when they differ from the tidied version above. */
  heard?: string;
  /** True when a later dictation corrected this one and the tidied words were rewritten. */
  correctedLater?: boolean;
  changes: { heading: string; text: string; flagged: boolean }[];
};

export type Report = {
  title: string;
  sections: ReportSection[];
  impression: string[];
  /** Saved with the report so its history is still there when it is reopened. */
  log?: LogEntry[];
  /** The formatted document from the report editor, so bold, colour and layout survive a reopen. */
  doc?: unknown;
};

/** Describes what one dictation changed, for the report log. */
export function logEntryFor(
  report: Report,
  ops: PatchOp[],
  dictation: string,
  first: boolean,
): LogEntry {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    kind: ops.length === 0 ? "unchanged" : first ? "created" : "updated",
    dictation,
    changes: ops.map((op) => ({
      heading: report.sections.find((section) => section.id === op.sectionId)?.heading ?? "",
      text: op.op === "reset" ? "Put back to the normal wording." : op.text,
      flagged: op.warnings.length > 0,
    })),
  };
}

export type PatchOp = {
  op: "replace" | "add" | "reset";
  sectionId: string;
  lineId: string;
  text: string;
  source: string;
  warnings: string[];
};

export function reportFromTemplate(template: Template): Report {
  return {
    title: template.title,
    sections: template.sections.map((section) => ({
      id: section.id,
      heading: section.heading,
      lines: section.lines.map((line) => ({
        id: line.id,
        text: line.text,
        status: "normal",
        warnings: [],
      })),
    })),
    impression: template.normalImpression,
  };
}

export function applyPatch(
  report: Report,
  template: Template,
  ops: PatchOp[],
  impression: string[],
): Report {
  const sections = report.sections.map((section) => ({
    ...section,
    lines: [...section.lines],
  }));

  for (const op of ops) {
    const section = sections.find((candidate) => candidate.id === op.sectionId);
    if (!section) continue;

    if (op.op === "add") {
      section.lines.push({
        id: `${section.id}.${crypto.randomUUID().slice(0, 8)}`,
        text: op.text,
        status: "spoken",
        source: op.source,
        warnings: op.warnings,
      });
      continue;
    }

    const index = section.lines.findIndex((line) => line.id === op.lineId);
    if (index === -1) continue;

    if (op.op === "replace") {
      section.lines[index] = {
        id: op.lineId,
        text: op.text,
        status: "spoken",
        source: op.source,
        warnings: op.warnings,
      };
      continue;
    }

    // reset: back to the template's normal wording, or gone if the line was added.
    const templateLine = template.sections
      .find((candidate) => candidate.id === section.id)
      ?.lines.find((line) => line.id === op.lineId);
    if (templateLine) {
      section.lines[index] = {
        id: templateLine.id,
        text: templateLine.text,
        status: "normal",
        warnings: [],
      };
    } else {
      section.lines.splice(index, 1);
    }
  }

  return { ...report, sections, impression };
}
