import { Suspense } from 'react';
import CatalogoPage from '../catalogo/page';

/**
 * /vitrine/busca reusa a mesma tela do catálogo — a diferença está apenas nos
 * parâmetros de URL (`q`, `marca`), que o CatalogoContent já lê.
 */
export default function BuscaPage() {
  return (
    <Suspense fallback={<div className="mv-container mv-section"><div className="mv-skel h-64" /></div>}>
      <CatalogoPage />
    </Suspense>
  );
}
