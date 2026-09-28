'use client';

interface Filtros {
  marca: string; categoria: string; precoMin: string; precoMax: string;
  promocao: boolean; compatibilidade: string; subcategoria: string;
}

/**
 * Painel de filtros do catálogo/vitrine.
 *
 * É o MESMO componente nos dois lugares: inline no desktop e dentro da gaveta
 * (`.mv-drawer`) no celular. Por isso ele NÃO desenha card nem cabeçalho próprio —
 * apenas os controles, para o consumidor decidir a moldura.
 *
 * Toda a semântica de filtragem é a que já existia; nada mudou de comportamento:
 * a categoria ativa nunca é um slug `tipo:` (defensivo) e as subcategorias são as
 * reais, vindas da API pública /api/vitrine/categorias.
 */
export default function FiltrosBarra({
  categorias, marcas, filtros, onChange, mode, onModeChange, onLimpar, total,
}: {
  categorias: { slug: string; nome: string; subcategorias?: { slug: string; nome: string }[] }[];
  marcas: string[];
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  mode?: 'grid' | 'list';
  onModeChange?: (m: 'grid' | 'list') => void;
  onLimpar?: () => void;
  total?: number;
}) {
  // A categoria ativa NUNCA é um slug `tipo:` (esses são subcategorias derivadas).
  // Se por acaso chegar um slug `tipo:` em filtros.categoria (defensivo), ignora.
  const catAtiva = categorias.find(c => c.slug === filtros.categoria && !c.slug.startsWith('tipo:'));

  const temFiltroAtivo = !!(filtros.categoria || filtros.marca || filtros.compatibilidade || filtros.precoMin || filtros.precoMax || filtros.promocao || filtros.subcategoria);

  const set = (parcial: Partial<Filtros>) => onChange({ ...filtros, ...parcial });

  return (
    <div className="flex flex-col gap-5">
      {/* CATEGORIA + SUBCATEGORIA */}
      <div>
        <label className="mv-label" htmlFor="mv-f-cat">Categoria</label>
        <select id="mv-f-cat" value={filtros.categoria} onChange={e => set({ categoria: e.target.value, subcategoria: '' })}
          className="mv-input w-full">
          <option value="">Todas as categorias</option>
          {categorias.map(c => <option key={c.slug} value={c.slug}>{c.nome}</option>)}
        </select>

        {/* Subcategoria (quando a categoria tem) — navegação rápida por chips,
            SÓ subcategorias com produto visível (já vêm filtradas da API). */}
        {catAtiva?.subcategorias && catAtiva.subcategorias.length > 0 && (
          <div className="mt-3">
            <span className="mv-label">Tipo</span>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => set({ subcategoria: '' })}
                className={`mv-pill ${!filtros.subcategoria ? 'mv-on' : ''}`}>Todos</button>
              {catAtiva.subcategorias.map(s => (
                <button key={s.slug} type="button"
                  onClick={() => set({ subcategoria: filtros.subcategoria === s.slug ? '' : s.slug })}
                  className={`mv-pill ${filtros.subcategoria === s.slug ? 'mv-on' : ''}`}>
                  {s.nome}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MARCA */}
      <div>
        <label className="mv-label" htmlFor="mv-f-marca">Marca</label>
        <select id="mv-f-marca" value={filtros.marca} onChange={e => set({ marca: e.target.value })}
          className="mv-input w-full">
          <option value="">Todas as marcas</option>
          {marcas.filter(Boolean).map(m => <option key={m} value={m!}>{m}</option>)}
        </select>
      </div>

      {/* COMPATIBILIDADE */}
      <div>
        <label className="mv-label" htmlFor="mv-f-comp">Moto / modelo</label>
        <input id="mv-f-comp" type="text" placeholder="Ex.: CG 160, Biz 125…" value={filtros.compatibilidade}
          onChange={e => set({ compatibilidade: e.target.value })} className="mv-input w-full" />
      </div>

      {/* PREÇO */}
      <div>
        <span className="mv-label">Faixa de preço</span>
        <div className="flex items-center gap-2">
          <input type="number" min="0" placeholder="Mín" value={filtros.precoMin}
            onChange={e => set({ precoMin: e.target.value })} className="mv-input w-full" aria-label="Preço mínimo" />
          <span className="text-[var(--mv-text-3)] flex-none">—</span>
          <input type="number" min="0" placeholder="Máx" value={filtros.precoMax}
            onChange={e => set({ precoMax: e.target.value })} className="mv-input w-full" aria-label="Preço máximo" />
        </div>
      </div>

      {/* PROMOÇÃO */}
      <button type="button" onClick={() => set({ promocao: !filtros.promocao })}
        className={`mv-toggle self-start ${filtros.promocao ? 'mv-on' : ''}`} aria-pressed={filtros.promocao}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a2 2 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
        </svg>
        Somente em promoção
      </button>

      {/* RODAPÉ: limpar + modo de visualização */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--mv-line)] flex-wrap">
        {onLimpar ? (
          <button type="button" onClick={onLimpar} disabled={!temFiltroAtivo}
            className="text-xs font-bold text-[var(--mv-brand)] hover:underline disabled:opacity-35 disabled:no-underline">
            Limpar filtros
          </button>
        ) : <span />}

        {onModeChange && (
          <div className="flex items-center gap-1 bg-[var(--mv-surface-2)] border border-[var(--mv-line)] rounded-lg p-1">
            <button type="button" onClick={() => onModeChange('grid')} aria-label="Ver em grade" aria-pressed={mode === 'grid'}
              className={`w-8 h-7 rounded-md flex items-center justify-center transition-colors ${mode === 'grid' ? 'bg-[var(--mv-surface)] text-[var(--mv-brand)] shadow-[var(--mv-sh-xs)]' : 'text-[var(--mv-text-3)] hover:text-[var(--mv-text)]'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button type="button" onClick={() => onModeChange('list')} aria-label="Ver em lista" aria-pressed={mode === 'list'}
              className={`w-8 h-7 rounded-md flex items-center justify-center transition-colors ${mode === 'list' ? 'bg-[var(--mv-surface)] text-[var(--mv-brand)] shadow-[var(--mv-sh-xs)]' : 'text-[var(--mv-text-3)] hover:text-[var(--mv-text)]'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
