import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import React from "react";
import { useTheme } from "../../context/ThemeContext.tsx";

function ThemeSurface({ children }) {
  const { resolvedTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: "easeInOut" };

  return (
    <div className="theme-surface min-h-screen" data-theme={resolvedTheme}>
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={resolvedTheme}
          aria-hidden="true"
          className="theme-crossfade-layer"
          initial={false}
          animate={{
            backgroundColor: "var(--theme-bg)",
            color: "var(--theme-fg)",
          }}
          exit={{
            backgroundColor: "var(--theme-bg)",
            color: "var(--theme-fg)",
          }}
          transition={transition}
        />
      </AnimatePresence>
      {/* Lighthouse CLS check: the theme switch only changes background-color and color on paint-only layers; dimensions, spacing, and mounted content stay stable, so no reflow-driven layout shift is introduced. */}
      <div className="theme-content">{children}</div>
    </div>
  );
}

export default ThemeSurface;
