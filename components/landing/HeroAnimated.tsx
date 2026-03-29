/// components/landing/HeroAnimated.tsx
"use client";

import { motion } from "framer-motion";
import { fadeUp, scaleIn, staggerContainer, EASE_OUT_EXPO, slowTransition } from "@/lib/animations";
import type { ReactNode } from "react";

/** Stagger container that animates on page load (not scroll) */
export function HeroStagger({
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
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

/** Stagger child that fades up inside HeroStagger */
export function HeroChild({
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

/** InsightCard entrance: scale in with delay, then float */
export function HeroCardEntrance({
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
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      transition={{ ...slowTransition, delay: 0.3 }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
