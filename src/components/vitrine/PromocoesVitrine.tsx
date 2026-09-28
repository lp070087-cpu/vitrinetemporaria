'use client';

import { useState, useEffect } from 'react';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda.
function precoPublico(p: any): number {
  const pv = p?.precoVitrine != null ? Number(p.precoVitrine) : NaN;
  if (Number.isFinite(pv) && pv > 0) return pv;
  if (p?.precoOferta && Number(p.precoOferta) < Number(p.precoVenda)) return Number(p.precoOferta);
  return Number(p?.precoVenda) || 0;
}

/**
 * Blocos de promoção — data-driven de /api/vitrine/promocoes.
 * `destaque`, `percentual`, `titulo`, `subtitulo` e as datas vêm do cadastro
 * da DONA. Nada aqui é calculado nem inventado além da contagem de tempo.
 */
export function PromocoesBlocos({ modo = 'completo' }: { modo?: 'completo' | 'compacto' }) {
  const [promocoes, setPromocoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/vitrine/promocoes').then(r => r.json())
      .then(d => { setPromocoes(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="mv-skel h-[240px] rounded-[var(--mv-r-xl)]" />)}
      </div>
    );
  }

  if (promocoes.length === 0) {
    return (
      <div className="mv-empty">
        <p className="text-sm text-[var(--mv-text-2)] font-semibold">Nenhuma promoção ativa no momento.</p>
        <p className="text-xs text-[var(--mv-text-3)] mt-1">Volte em breve — as ofertas mudam com frequência.</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 ${modo === 'completo' ? 'md:grid-cols-2' : ''} gap-4`}>
      {promocoes.map(p => {
        const fim = new Date(p.dataFim);
        const diff = fim.getTime() - new Date().getTime();
        const dias = Math.max(0, Math.ceil(diff / 86400000));
        const horas = Math.max(0, Math.ceil(diff / 3600000));
        const encerrada = diff <= 0;

        return (
          <div key={p.id}
            className={`rounded-[var(--mv-r-xl)] overflow-hidden border transition-shadow hover:shadow-[var(--mv-sh-md)] ${
              p.destaque ? 'border-transparent mv-strip-brand' : 'border-[var(--mv-line)] bg-[var(--mv-surface)]'
            }`}>

            {/* Cabeçalho da promoção */}
            <div className={`p-5 md:p-6 ${p.destaque ? 'text-white' : ''}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <h3 className={`text-lg md:text-xl font-extrabold leading-tight ${p.destaque ? 'text-white' : 'text-[var(--mv-text)]'}`}>
                    {p.titulo}
                  </h3>
                  {p.subtitulo && (
                    <p className={`text-sm mt-1.5 leading-relaxed ${p.destaque ? 'text-white/80' : 'text-[var(--mv-text-2)]'}`}>
                      {p.subtitulo}
                    </p>
                  )}
                  {p.percentual && (
                    <span className={`inline-flex items-center mt-3 px-3 py-1.5 rounded-full text-xs font-extrabold ${
                      p.destaque ? 'bg-white/20 text-white' : 'bg-[var(--mv-alert-soft)] text-[var(--mv-alert)]'
                    }`}>
                      Até {Number(p.percentual)}% OFF
                    </span>
                  )}
                </div>

                {/* Contagem regressiva — derivada de dataFim (dado real do cadastro) */}
                <div className={`px-4 py-2.5 rounded-xl text-center min-w-[92px] flex-shrink-0 ${
                  p.destaque ? 'bg-white/20 text-white' : 'bg-[var(--mv-brand-soft)] text-[var(--mv-brand)]'
                }`}>
                  <p className="text-[9px] font-extrabold uppercase tracking-wider opacity-80">
                    {encerrada ? 'Encerrada' : 'Termina em'}
                  </p>
                  <p className="text-lg font-extrabold leading-tight">
                    {encerrada ? '—' : dias > 0 ? `${dias}d` : `${horas}h`}
                  </p>
                </div>
              </div>
            </div>

            {/* Produtos da promoção */}
            {p.produtos?.length > 0 && (
              <div className={`p-4 grid grid-cols-2 ${modo === 'completo' ? 'sm:grid-cols-3' : ''} gap-3 ${p.destaque ? 'bg-[var(--mv-surface)]' : 'border-t border-[var(--mv-line)]'}`}>
                {p.produtos.slice(0, modo === 'completo' ? 6 : 3).map((pp: any) => (
                  <a key={pp.id} href={`/vitrine/produto/${pp.peca.id}`} className="group">
                    <span className="block aspect-square rounded-xl overflow-hidden bg-[var(--mv-surface-2)] border border-[var(--mv-line)] mb-2">
                      {pp.peca.imagemUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pp.peca.imagemUrl} alt={pp.peca.nome}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center">
                          <svg className="w-7 h-7 text-[var(--mv-line-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16" />
                          </svg>
                        </span>
                      )}
                    </span>
                    <span className="block text-[11px] font-semibold text-[var(--mv-text)] line-clamp-2 group-hover:text-[var(--mv-brand)] transition-colors">
                      {pp.peca.nome}
                    </span>
                    <span className="block text-xs font-extrabold text-[var(--mv-text)] mt-1">{fm(precoPublico(pp.peca))}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Página /vitrine/promocoes — mesmo componente, em largura total. */
export default function PromocoesVitrine() {
  return (
    <div>
      <div className="mv-page-head">
        <div className="mv-container py-10 md:py-12">
          <h1 className="mv-page-title">Promoções</h1>
          <p className="text-sm text-[var(--mv-text-on-dark-2)] mt-2">
            Ofertas ativas na loja, por tempo limitado ou enquanto durar o estoque.
          </p>
        </div>
      </div>
      <div className="mv-container mv-section">
        <PromocoesBlocos />
      </div>
    </div>
  );
}
