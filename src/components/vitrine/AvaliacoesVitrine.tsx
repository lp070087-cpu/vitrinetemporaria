'use client';

import { useState, useEffect } from 'react';

interface AvaliacaoData {
  id: string; nota: number; titulo?: string; comentario?: string; fotos?: string;
  verificada: boolean; createdAt: string; cliente: { nome: string };
}

// Renderiza N estrelas cheias (âmbar) + (5-N) estrelas cinza vazias.
function Estrelas({ nota, size = 'text-sm' }: { nota: number; size?: string }) {
  return (
    <span className={`${size} inline-flex items-center gap-0.5`} aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} aria-hidden="true" className={n <= nota ? 'text-[var(--mv-gold)]' : 'text-[var(--mv-line-strong)]'}>★</span>
      ))}
    </span>
  );
}

export default function AvaliacoesVitrine({ pecaId }: { pecaId: string }) {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoData[]>([]);
  const [media, setMedia] = useState(0);
  const [total, setTotal] = useState(0);
  const [dist, setDist] = useState<Record<number, number>>({ 1:0,2:0,3:0,4:0,5:0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    fetch(`/api/vitrine/avaliacoes?pecaId=${pecaId}`)
      .then(r => r.json()).then(d => {
        if (!ativo) return;
        setAvaliacoes(d.avaliacoes || []);
        setMedia(d.media || 0);
        setTotal(d.total || 0);
        setDist(d.distribuicao || { 1:0,2:0,3:0,4:0,5:0 });
      }).catch(() => { /* silencioso */ })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [pecaId]);

  if (loading) return <div className="py-6 flex justify-center"><span className="mv-spin" /></div>;

  return (
    <div className="flex flex-col gap-6">
      {/* Resumo */}
      <div className="mv-panel !p-4 flex items-center gap-6 flex-wrap">
        <div className="text-center flex-none">
          <p className="text-3xl font-extrabold text-[var(--mv-text)] tabular-nums">{total > 0 ? media.toFixed(1) : '—'}</p>
          <Estrelas nota={total > 0 ? Math.round(media) : 0} size="text-xs" />
          <p className="text-[10px] text-[var(--mv-text-3)] mt-1">{total > 0 ? `${total} avaliações` : 'Sem avaliações'}</p>
        </div>
        <div className="flex-1 flex flex-col gap-1.5 min-w-[140px] sm:min-w-[200px]">
          {[5,4,3,2,1].map(n => {
            const pct = total > 0 ? (dist[n] / total) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-right text-[var(--mv-text-3)] tabular-nums">{n}★</span>
                <div className="flex-1 h-1.5 bg-[var(--mv-surface-2)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--mv-gold)] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-6 text-[var(--mv-text-3)] tabular-nums">{dist[n]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {avaliacoes.length === 0 ? (
        <div className="py-10 text-center">
          <Estrelas nota={0} size="text-3xl" />
          <p className="text-xs text-[var(--mv-text-3)] mt-3">Seja o primeiro a avaliar este produto.</p>
        </div>
      ) : (
        <div className="flex flex-col">
          {avaliacoes.map(a => (
            <div key={a.id} className="border-b border-[var(--mv-line)] pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-sm font-bold text-[var(--mv-text)]">{a.cliente.nome}</span>
                <Estrelas nota={a.nota} size="text-xs" />
                {a.verificada && <span className="mv-badge mv-badge-ok !text-[9px] !px-1.5 !py-0.5">Verificada</span>}
              </div>
              {a.titulo && <p className="text-xs font-bold text-[var(--mv-text)] mb-1">{a.titulo}</p>}
              {a.comentario && <p className="text-xs text-[var(--mv-text-2)] leading-relaxed">{a.comentario}</p>}
              <p className="text-[10px] text-[var(--mv-text-3)] mt-2">{new Date(a.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
