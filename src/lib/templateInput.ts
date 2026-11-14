import type { Template } from "./report";

/** A template as it is edited and stored: plain headings and lines, no ids. */
export type TemplateDraft = {
  name: string;
  title: string;
  sections: { heading: string; lines: string[] }[];
  normalImpression: string[];
};

export const TEMPLATE_LIMITS = { sections: 20, lines: 60, lineLength: 600, impression: 10 };

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function lines(value: unknown, max: number) {
  return (Array.isArray(value) ? value : [])
    .map((line) => clean(line, TEMPLATE_LIMITS.lineLength))
    .filter(Boolean)
    .slice(0, max);
}

/** Checks a submitted template. Returns the cleaned draft or a message for the user. */
export function parseTemplateDraft(body: unknown): TemplateDraft | string {
  const input = (body ?? {}) as Record<string, unknown>;
  const name = clean(input.name, 120);
  const title = clean(input.title, 160);
  if (!name) return "Give the template a name.";
  if (!title) return "Give the report a title.";

  const sections = (Array.isArray(input.sections) ? input.sections : [])
    .slice(0, TEMPLATE_LIMITS.sections)
    .map((section) => ({
      heading: clean((section as Record<string, unknown>)?.heading, 120),
      lines: lines((section as Record<string, unknown>)?.lines, TEMPLATE_LIMITS.lines),
    }))
    .filter((section) => section.heading || section.lines.length > 0);

  if (sections.length === 0) return "Add at least one section.";
  if (sections.some((section) => !section.heading)) return "Every section needs a heading.";
  if (sections.some((section) => section.lines.length === 0)) {
    return "Every section needs at least one line.";
  }

  const normalImpression = lines(input.normalImpression, TEMPLATE_LIMITS.impression);
  if (normalImpression.length === 0) return "Add the impression used when everything is normal.";

  return { name, title, sections, normalImpression };
}

/** Gives a stored draft the section and line ids the report engine works with. */
export function toTemplate(id: string, draft: TemplateDraft): Template {
  return {
    id,
    name: draft.name,
    title: draft.title,
    sections: draft.sections.map((section, sectionIndex) => ({
      id: `s${sectionIndex + 1}`,
      heading: section.heading,
      lines: section.lines.map((text, lineIndex) => ({
        id: `s${sectionIndex + 1}.l${lineIndex + 1}`,
        text,
      })),
    })),
    normalImpression: draft.normalImpression,
  };
}

export function toDraft(template: Template): TemplateDraft {
  return {
    name: template.name,
    title: template.title,
    sections: template.sections.map((section) => ({
      heading: section.heading,
      lines: section.lines.map((line) => line.text),
    })),
    normalImpression: template.normalImpression,
  };
}
