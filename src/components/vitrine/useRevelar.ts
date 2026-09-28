'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Entrada suave de uma seção quando ela aparece na tela — uma vez só.
 *
 * Usado com a classe `.mv-reveal` de `vitrine.css`. Sem este hook a classe é uma
 * ARMADILHA: `.mv-reveal` nasce com `opacity: 0` e nunca ganharia `.mv-in`, ou
 * seja, a seção ficaria invisível para sempre.
 *
 * Comportamento seguro por construção:
 *  • sem `IntersectionObserver` (navegador antigo) a seção nasce visível;
 *  • `prefers-reduced-motion` é respeitado pelo CSS, que anula a transição;
 *  • nada de conteúdo depende do JS para aparecer — o pior caso é aparecer sem
 *    animação.
 */
export function useRevelar<T extends HTMLElement>(ref?: RefObject<T | null>) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { setVisivel(true); return; }

    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisivel(true);
          obs.disconnect(); // uma vez só: a seção não "pisca" ao rolar de volta
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref]);

  return visivel;
}
