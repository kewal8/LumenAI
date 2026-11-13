import type { Template } from "./report";

// Placeholder wording until the radiologist's own templates are loaded.
export const CT_BRAIN_PLAIN: Template = {
  id: "ct-brain-plain",
  name: "CT Brain (Plain)",
  title: "CT BRAIN (PLAIN)",
  sections: [
    {
      id: "technique",
      heading: "TECHNIQUE",
      lines: [
        {
          id: "technique.protocol",
          text: "Axial sections of the brain were obtained without intravenous contrast.",
        },
      ],
    },
    {
      id: "findings",
      heading: "FINDINGS",
      lines: [
        {
          id: "findings.parenchyma",
          text: "Cerebral parenchyma shows normal attenuation with preserved grey-white matter differentiation.",
        },
        {
          id: "findings.haemorrhage",
          text: "No intracranial haemorrhage, mass lesion or acute infarct.",
        },
        {
          id: "findings.ventricles",
          text: "Ventricular system, sulci and basal cisterns are normal.",
        },
        { id: "findings.midline", text: "No midline shift." },
        {
          id: "findings.posterior-fossa",
          text: "Brainstem and cerebellum are normal.",
        },
        {
          id: "findings.sella",
          text: "Sella and parasellar regions are normal.",
        },
        {
          id: "findings.bones",
          text: "Calvarium and skull base are intact. No fracture.",
        },
        {
          id: "findings.sinuses",
          text: "Visualised paranasal sinuses and mastoid air cells are clear.",
        },
        {
          id: "findings.soft-tissue",
          text: "Extracranial soft tissues are unremarkable.",
        },
      ],
    },
  ],
  normalImpression: ["No significant abnormality detected."],
};

export const TEMPLATES: Template[] = [CT_BRAIN_PLAIN];
