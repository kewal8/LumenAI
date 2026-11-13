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

export type Report = {
  title: string;
  sections: ReportSection[];
  impression: string[];
};

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
