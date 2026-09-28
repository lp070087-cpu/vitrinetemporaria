'use client';

import { useRef, type ReactNode } from 'react';
import { useRevelar } from './useRevelar';

/**
 * Seção da vitrine com entrada suave.
 *
 * Existe para que nenhuma seção seja escrita à mão com `.mv-reveal` — a classe
 * sozinha deixaria o conteúdo invisível (nasce com `opacity: 0` e depende do
 * `.mv-in`). Aqui o estado vem do hook e o pior caso é a seção aparecer sem
 * animação.
 *
 * `className` já vem com `mv-section` (o ritmo vertical entre seções).
 */
export default function SecaoVitrine({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const visivel = useRevelar(ref);

  return (
    <section ref={ref} className={`mv-section mv-reveal ${visivel ? 'mv-in' : ''} ${className}`.trim()}>
      {children}
    </section>
  );
}
