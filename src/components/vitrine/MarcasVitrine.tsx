'use client';

import { useState, useEffect } from 'react';

/**
 * Vitrine de marcas — data-driven de /api/vitrine/marcas.
 * Cada marca usa `logoUrl` quando cadastrada; senão cai para a inicial do nome
 * (nunca um quadrado vazio).
 */
export function MarcasGrade({ limite }: { limite?: number }) {
  const [marcas, setMarcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [falhou, setFalhou] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/vitrine/marcas').then(r => r.json()).then(d => { setMarcas(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Só marcas que realmente têm produto — as demais gerariam link para busca vazia.
  const comProdutos = marcas.filter((m: any) => m.quantidadeProdutos > 0);
  const exibicao = limite ? comProdutos.slice(0, limite) : comProdutos;

  if (loading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="mv-skel h-[92px]" />)}
      </div>
    );
  }

  if (comProdutos.length === 0) {
    return <p className="text-sm text-[var(--mv-text-3)] py-8 text-center">Nenhuma marca cadastrada no momento.</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {exibicao.map((m: any) => (
        <a key={m.slug || m.nome} href={`/vitrine/busca?marca=${encodeURIComponent(m.nome)}`}
          className="group mv-panel !p-4 flex flex-col items-center text-center transition-all hover:-translate-y-0.5 hover:shadow-[var(--mv-sh-md)] hover:border-[var(--mv-brand-line)]">
          <span className="w-14 h-14 rounded-xl bg-[var(--mv-surface-2)] border border-[var(--mv-line)] flex items-center justify-center mb-2.5 overflow-hidden">
            {m.logoUrl && !falhou[m.nome] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={m.logoUrl} alt={m.nome} className="max-w-full max-h-full object-contain p-1.5"
                onError={() => setFalhou(prev => ({ ...prev, [m.nome]: true }))} />
            ) : (
              <span className="text-xl font-extrabold text-[var(--mv-brand)]">{String(m.nome).charAt(0)}</span>
            )}
          </span>
          <span className="text-xs font-bold text-[var(--mv-text)] group-hover:text-[var(--mv-brand)] transition-colors truncate w-full">{m.nome}</span>
          <span className="text-[10px] text-[var(--mv-text-3)] mt-0.5">{m.quantidadeProdutos} produtos</span>
        </a>
      ))}
    </div>
  );
}

export default function MarcasVitrine() {
  return (
    <div>
      <div className="mv-page-head">
        <div className="mv-container py-10 md:py-12">
          <h1 className="mv-page-title">Marcas</h1>
          <p className="text-sm text-[var(--mv-text-on-dark-2)] mt-2">
            Marcas disponíveis na loja. Clique para ver os produtos de cada uma.
          </p>
        </div>
      </div>
      <div className="mv-container mv-section">
        <MarcasGrade />
      </div>
    </div>
  );
}
