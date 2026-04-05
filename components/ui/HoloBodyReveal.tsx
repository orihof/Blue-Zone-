'use client'
import { motion, useReducedMotion } from 'motion/react'
import { HoloBody } from './HoloBody'

export function HoloBodyReveal() {
  const shouldReduce = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        shouldReduce
          ? { duration: 0 }
          : { duration: 0.55, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }
      }
      style={{
        width: '100%',
        maxWidth: '720px',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <HoloBody className="w-full" />
    </motion.div>
  )
}
