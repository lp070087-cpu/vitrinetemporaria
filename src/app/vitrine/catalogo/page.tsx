import { Suspense } from 'react';
import { Metadata } from 'next';
import CatalogoContent from './CatalogoContent';

export const metadata: Metadata = {
  title: 'Catálogo de Peças — Marquinho Moto Peças',
  description: 'Catálogo completo de peças, acessórios, pneus e óleos para motos. Filtre por categoria, marca e faixa de preço.',
  alternates: { canonical: '/vitrine/catalogo' },
};

export default function CatalogoPage() {
  return (
    <Suspense fallback={
      <div className="mv-container mv-section">
        <div className="mv-skel h-24 mb-6" />
        <div className="mv-grid">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="mv-skel aspect-[3/4]" />)}
        </div>
      </div>
    }>
      <CatalogoContent />
    </Suspense>
  );
}
