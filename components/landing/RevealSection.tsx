/// components/landing/RevealSection.tsx
"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, defaultTransition, EASE_OUT_EXPO } from "@/lib/animations";
import type { ReactNode } from "react";

interface RevealSectionProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Use stagger mode to auto-stagger direct children wrapped in RevealChild */
  stagger?: boolean;
  /** Viewport margin for early/late trigger */
  margin?: string;
  as?: "div" | "section";
}

export function RevealSection({
  children,
  className,
  style,
  stagger = false,
  margin = "-80px",
  as = "div",
}: RevealSectionProps) {
  const Component = as === "section" ? motion.section : motion.div;
  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin }}
      variants={stagger ? staggerContainer : fadeUp}
      transition={stagger ? undefined : defaultTransition}
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}

/** Child element that staggers inside a RevealSection with stagger={true} */
export function RevealChild({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
