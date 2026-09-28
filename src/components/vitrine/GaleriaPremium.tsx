'use client';

import { useState, useEffect } from 'react';

interface Imagem { id: string; url: string; tipo: string; cor?: string | null; }
interface Documento { id: string; nome: string; tipo: string; url: string; }

/**
 * Galeria do produto.
 *
 * Preserva integralmente: a foto PRINCIPAL vem primeiro, a cor associada à foto
 * só aparece quando existe (nunca null/vazio), a capa cai para a primeira imagem
 * se nenhuma for marcada como principal e o lightbox navega em ciclo.
 */
export default function GaleriaPremium({ imagens, videos, nome }: { imagens: Imagem[]; videos?: Documento[]; nome: string }) {
  const [selected, setSelected] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [imgError, setImgError] = useState(false);

  const principal = imagens.find(i => i.tipo === 'PRINCIPAL') || imagens[0];
  const displayImgs = principal ? [principal, ...imagens.filter(i => i.id !== principal.id)] : imagens;

  const current = displayImgs[selected];
  // Rodada Subcategorias (2026-08-21): mostra a cor associada à foto quando existir.
  // NUNCA mostra null/undefined/vazio.
  const corAtual = current?.cor && current.cor.trim() ? current.cor.trim() : '';

  const anterior = () => setSelected(prev => (prev > 0 ? prev - 1 : displayImgs.length - 1));
  const proxima = () => setSelected(prev => (prev < displayImgs.length - 1 ? prev + 1 : 0));

  // Teclado no lightbox — Esc fecha, setas navegam. Só ativo com o lightbox aberto.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(false);
      if (e.key === 'ArrowLeft' && displayImgs.length > 1) anterior();
      if (e.key === 'ArrowRight' && displayImgs.length > 1) proxima();
    };
    window.addEventListener('keydown', onKey);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowAnterior;
    };
  }, [lightbox, displayImgs.length]);

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* IMAGEM PRINCIPAL */}
        <button type="button" onClick={() => setLightbox(true)}
          aria-label={`Ampliar imagem de ${nome}`}
          className="aspect-square w-full rounded-[var(--mv-r-xl)] overflow-hidden cursor-zoom-in relative bg-[var(--mv-surface-2)] border border-[var(--mv-line)] group block">
          {current && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt={nome}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              onError={() => setImgError(true)} />
          ) : (
            <span className="w-full h-full flex items-center justify-center">
              <svg className="w-20 h-20 text-[var(--mv-line-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          )}

          {corAtual && (
            <span className="absolute bottom-3 left-3 mv-badge mv-badge-ink !text-[11px] !px-2.5 !py-1">
              Cor: {corAtual}
            </span>
          )}

          <span className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-[rgba(11,18,32,0.72)] backdrop-blur flex items-center justify-center text-white transition-transform group-hover:scale-105">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </span>
        </button>

        {/* MINIATURAS */}
        {(displayImgs.length > 1 || (videos?.length ?? 0) > 0) && (
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {displayImgs.map((img, i) => {
              const corThumb = img.cor && img.cor.trim() ? img.cor.trim() : '';
              const on = i === selected;
              return (
                <button key={img.id} type="button" onClick={() => { setSelected(i); setImgError(false); }}
                  aria-label={`Ver imagem ${i + 1} de ${displayImgs.length}`} aria-pressed={on}
                  className={`relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-[var(--mv-r-md)] overflow-hidden flex-none border-2 transition-all ${
                    on ? 'border-[var(--mv-brand)] ring-2 ring-[var(--mv-brand-soft)]' : 'border-[var(--mv-line)] hover:border-[var(--mv-brand-line)]'
                  }`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {corThumb && (
                    <span className="absolute bottom-0 inset-x-0 px-1 py-0.5 bg-black/65 text-white text-[8px] font-bold text-center truncate leading-tight">
                      {corThumb}
                    </span>
                  )}
                </button>
              );
            })}
            {videos?.length ? videos.map(v => (
              <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                aria-label={`Ver vídeo ${v.nome}`}
                className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-[var(--mv-r-md)] border border-[var(--mv-ink-line)] bg-[var(--mv-ink)] flex items-center justify-center flex-none hover:border-[var(--mv-brand)] transition-colors">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </a>
            )) : null}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && current && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
          role="dialog" aria-modal="true" aria-label={`Imagem ampliada de ${nome}`}
          onClick={() => setLightbox(false)}>
          <button type="button" aria-label="Fechar imagem"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt={nome} className="max-w-full max-h-[90vh] object-contain rounded-[var(--mv-r-lg)]"
            onClick={e => e.stopPropagation()} />

          {displayImgs.length > 1 && (
            <>
              <button type="button" aria-label="Imagem anterior"
                onClick={e => { e.stopPropagation(); anterior(); }}
                className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button type="button" aria-label="Próxima imagem"
                onClick={e => { e.stopPropagation(); proxima(); }}
                className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* Indicador de posição */}
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/70 text-xs font-bold tabular-nums">
                {selected + 1} / {displayImgs.length}
              </span>
            </>
          )}
        </div>
      )}
    </>
  );
}
