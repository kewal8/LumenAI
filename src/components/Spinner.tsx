/**
 * Turning ring shown inside a button while its action is running. A button
 * holding one stays at full strength instead of fading like a disabled one
 * (see the .spinner rule in globals.css).
 */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`spinner inline-block shrink-0 rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}
