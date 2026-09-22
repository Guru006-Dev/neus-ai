import { motion } from 'motion/react';
import type { ReactNode } from 'react';

/**
 * Fades + eases content up into place the first time it scrolls into view.
 * Built on `motion`'s native `whileInView` — no extra dependency, same
 * library already driving the nav dropdown's hover pill.
 */
export default function Reveal({
  children, delay = 0, y = 18, style,
}: { children: ReactNode; delay?: number; y?: number; style?: React.CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px -10% 0px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      style={style}
    >
      {children}
    </motion.div>
  );
}
