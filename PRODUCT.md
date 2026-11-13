# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: practising radiologists in India (consultants, freelancers, teleradiology readers) who report CT, MRI, X-ray and ultrasound studies beside a PACS such as Medsynapse, and who choose their own reporting tools. They read images in a dim reading room, report dozens of cases a day, and today type, dictate word by word, or correct a typist's draft.

Secondary: diagnostic centre owners who buy for a whole centre and care about report turnaround and consistency.

## Product Purpose

LumenAI writes the radiology report from speech. The radiologist dictates only the abnormal findings; the tool fills their own template, keeps every unmentioned line as the template's normal wording, writes the impression from the abnormal lines, and puts the finished report on the clipboard formatted for the PACS editor. Success is a report the radiologist can paste and sign with little or no correction, in less time than typing it.

## Positioning

Speak only what is abnormal; everything else stays normal, and the report is already copied in the format the PACS editor keeps. It sits beside any PACS in a browser tab and needs no integration.

## Operating Context

- Runs in Chrome next to the PACS viewer; the radiologist's eyes are on the images, not on this tool.
- Report is pasted with Ctrl+V into the PACS report editor (confirmed on Medsynapse: Arial 10 pt, bold headings, paragraphs survive the paste), then finalised there.
- Spoken corrections work the same way as findings ("remove the fracture", "change the size to 18 mm").
- Each generated line shows the dictated words it came from; lines where side, a number or negation does not match the dictation are flagged for checking.
- The radiologist reviews and signs every report. The tool does not read images and does not diagnose.

## Capabilities and Constraints

Working today: live medical speech recognition (Deepgram, Indian English), template-based report generation and impression (Claude), spoken edits, manual edits, safety flags, automatic copy for PACS, shared-password access for pilot testers.

Not built yet: importing a radiologist's own templates (one placeholder CT brain template exists), saving reports, PDF/Word export, floating always-on-top window, per-user accounts, billing.

Constraints: no real patient data until data agreements with the speech and AI providers are in place; pricing is undecided; no regulatory clearance has been sought and the tool makes no diagnostic claims.

## Brand Commitments

Name: LumenAI. Accent colour chosen by the owner: teal. No logo yet.

Landing page direction pinned by the owner (2026-11-14), replacing an earlier concept: page structure after highseat.com (hero with a product screenshot, then one section per selling point, each with a screenshot); visual style after humanto.io recoloured teal (soft grey gridded canvas, floating white pill navigation, pill buttons with a round arrow chip, large rounded white cards, coloured glow); story arc after 101gen.ai/mips; topics after somatiq.ai. Style and structure only: no copied text, logos, images or claims. Screenshots are placeholders until the product is ready.

## Evidence on Hand

- The working product itself (`/report`), usable for real screenshots or a live demonstration with made-up findings.
- It is being built and tested with a senior radiologist and teacher. He may be referred to in those words but must not be named.
- No customers, testimonials, usage numbers, speed benchmarks, pricing, certifications or compliance claims exist. Future work must not invent any.

## Product Principles

1. Never write what was not said. An invented finding in a signed report is a patient-safety problem.
2. The radiologist stays the author: every line is traceable to their words and every report is theirs to sign.
3. Stay out of the way. The tool lives beside the images and asks for as little attention as possible.
4. Fit the workflow that exists: any PACS, the radiologist's own templates, paste and sign.
5. Say plainly what the tool does not do.
