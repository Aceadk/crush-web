'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * Route-transition template for the auth flow: every navigation between auth
 * pages (login ↔ signup ↔ phone ↔ forgot-password …) re-mounts this template,
 * so the card gently crossfades/rises in instead of hard-swapping. Reduced
 * motion renders children directly.
 */
export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
