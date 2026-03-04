/// components/ui/PrimaryButton.tsx
// Aurora gradient CTA button — the centrepiece interaction element.
// Uses .btn-aurora class from globals.css + Framer Motion for entrance.
"use client";

import { motion } from "framer-motion";
import { EASE_BZ } from "./tokens";
import type { ComponentPropsWithoutRef } from "react";

interface PrimaryButtonProps extends ComponentPropsWithoutRef<"button"> {
  /** Show entrance scale animation on mount */
  animate?: boolean;
  /** Smaller pill variant (40px height) */
  size?: "default" | "sm";
}

export function PrimaryButton({
  children,
  animate = true,
  size = "default",
  className = "",
  style,
  ...props
}: PrimaryButtonProps) {
  const smStyle = size === "sm"
    ? { height: 40, minWidth: "unset", padding: "0 20px", fontSize: 13 }
    : {};

  const btn = (
    <button
      className={`btn-aurora ${className}`}
      style={{ ...smStyle, ...style }}
      {...props}
    >
      {children}
    </button>
  );

  if (!animate) return btn;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: EASE_BZ }}
      style={{ display: "inline-flex" }}
    >
      {btn}
    </motion.div>
  );
}
