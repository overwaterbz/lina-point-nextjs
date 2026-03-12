'use client';

import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
  parallax?: boolean;      // vertical parallax on scroll
  kenBurns?: boolean;       // slow zoom animation
  priority?: boolean;
}

export default function AnimatedImage({
  src,
  alt,
  className = '',
  parallax = false,
  kenBurns = false,
  priority = false,
}: Props) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', parallax ? '15%' : '0%']);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <motion.div style={{ y }} className="relative w-full h-full">
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover ${kenBurns ? 'animate-ken-burns' : ''}`}
          priority={priority}
        />
      </motion.div>
    </div>
  );
}
