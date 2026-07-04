/**
 * Route-transition template for the auth flow: every navigation between auth
 * pages (login ↔ signup ↔ phone ↔ forgot-password …) re-mounts this template,
 * so the card gently rises/fades in instead of hard-swapping.
 *
 * Deliberately pure CSS (`motion-safe` keyframes, animation-fill both): the
 * card must never depend on a JS animation loop to become visible — an
 * earlier framer-motion version of this template started content at
 * opacity 0 and intermittently never ran `animate` under CPU contention
 * (vendored React 19 + framer-motion 11), leaving auth pages blank. CSS
 * animations run without JavaScript, respect prefers-reduced-motion via the
 * motion-safe variant, and replay on every template re-mount.
 */
export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <div className="motion-safe:animate-hero-in">{children}</div>;
}
