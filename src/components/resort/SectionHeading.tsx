'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  light?: boolean;
}

export default function SectionHeading({ eyebrow, title, description, light }: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="text-center mb-14">
      {eyebrow && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className={`text-xs tracking-[0.3em] uppercase font-semibold mb-3 ${
            light ? 'text-amber-400' : 'text-amber-600'
          }`}
        >
          {eyebrow}
        </motion.p>
      )}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.1 }}
        className={`font-display text-3xl md:text-5xl font-bold ${
          light ? 'text-white' : 'text-gray-900'
        }`}
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`mt-4 text-base md:text-lg max-w-2xl mx-auto ${
            light ? 'text-white/60' : 'text-gray-500'
          }`}
        >
          {description}
        </motion.p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-5 mx-auto w-16 h-[2px] bg-amber-500 origin-center"
      />
    </div>
  );
}
