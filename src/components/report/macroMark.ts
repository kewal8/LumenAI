// The one look for a macro in dictated text, used in the dictation box and in
// Settings so the doctor recognises it. Teal like other things Radmatic did for
// them; the solid bar means "full text written", the dashed line "short form,
// point at it to see or use the full text".
export const MACRO_MARK = {
  full: "rounded-[5px] bg-teal/[0.16] shadow-[inset_0_-2px_0_var(--c-teal)]",
  short:
    "rounded-[5px] bg-teal/[0.16] underline decoration-teal decoration-dashed decoration-2 underline-offset-[5px]",
};
