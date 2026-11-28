/**
 * The Radmatic logo, drawn on the golden ratio (see brand/logo). The letters
 * take the text colour, so they follow light and dark mode; the dot, the one
 * finding that matters, is always the brand teal.
 */

const WORD = "M0 81.8H23.61V181.8H0ZM0 143.61A61.8 61.8 0 0 1 61.8 81.8L61.8 105.41A38.2 38.2 0 0 0 23.61 143.61ZM175.43 131.8A51.5 51.5 0 0 1 72.43 131.8L96.03 131.8A27.89 27.89 0 0 0 151.82 131.8ZM72.43 131.8A51.5 51.5 0 0 1 175.43 131.8L151.82 131.8A27.89 27.89 0 0 0 96.03 131.8ZM151.82 81.8H175.43V181.8H151.82ZM294.95 131.8A51.5 51.5 0 0 1 191.95 131.8L215.56 131.8A27.89 27.89 0 0 0 271.34 131.8ZM191.95 131.8A51.5 51.5 0 0 1 294.95 131.8L271.34 131.8A27.89 27.89 0 0 0 215.56 131.8ZM271.34 20H294.95V181.8H271.34ZM316.2 81.8H339.8V181.8H316.2ZM316.2 133.3A51.5 51.5 0 0 1 419.2 133.3L395.59 133.3A27.89 27.89 0 0 0 339.8 133.3ZM395.59 133.3H419.2V181.8H395.59ZM395.59 133.3A51.5 51.5 0 0 1 498.59 133.3L474.98 133.3A27.89 27.89 0 0 0 419.2 133.3ZM474.98 133.3H498.59V181.8H474.98ZM618.12 131.8A51.5 51.5 0 0 1 515.12 131.8L538.72 131.8A27.89 27.89 0 0 0 594.51 131.8ZM515.12 131.8A51.5 51.5 0 0 1 618.12 131.8L594.51 131.8A27.89 27.89 0 0 0 538.72 131.8ZM594.51 81.8H618.12V181.8H594.51ZM651.38 43.61H674.98V181.8H651.38ZM632.28 81.8H694.08V105.41H632.28ZM708.25 81.8H731.85V181.8H708.25ZM836.29 168.22A51.5 51.5 0 1 1 836.29 95.39L819.6 112.08A27.89 27.89 0 1 0 819.6 151.53Z";
const MARK = "M0 0H30.22V128H0ZM0 79.11A79.11 79.11 0 0 1 79.11 0L79.11 30.22A48.89 48.89 0 0 0 30.22 79.11Z";

/** "radmatic" with its teal dot. Size it by height, e.g. className="h-6 w-auto". */
export function Wordmark({ className = "h-6 w-auto", title = "Radmatic" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 863.38 173.8" className={className} role="img" aria-label={title}>
      <g transform="translate(6 -14) scale(1)">
        <path d={WORD} fill="currentColor" />
        <circle cx="720.05" cy="39.1" r="19.1" fill="var(--c-teal)" />
      </g>
    </svg>
  );
}

/** The symbol alone: the r and its teal dot, for small square places. */
export function LogoMark({ className = "h-8 w-8", title = "Radmatic" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} role="img" aria-label={title}>
      <g transform="translate(48.89 61.44) scale(1)">
        <path d={MARK} fill="currentColor" />
        <circle cx="133.77" cy="24.45" r="24.45" fill="var(--c-teal)" />
      </g>
    </svg>
  );
}
