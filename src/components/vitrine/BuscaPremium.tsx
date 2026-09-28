'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'marquinho-busca-historico';
const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface SugestaoProduto { id: string; nome: string; codigo: string; imagemUrl?: string; precoVenda: number; precoOferta?: number; precoVitrine?: number; oferta?: boolean; marca?: string; }

// Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda.
function precoPublico(p: SugestaoProduto): number {
  const pv = p.precoVitrine != null ? Number(p.precoVitrine) : NaN;
  if (Number.isFinite(pv) && pv > 0) return pv;
  if (p.oferta && p.precoOferta && Number(p.precoOferta) < Number(p.precoVenda)) return Number(p.precoOferta);
  return Number(p.precoVenda) || 0;
}
interface SugestaoCategoria { slug: string; nome: string; }
interface SugestaoMarca { nome: string; }

/**
 * Busca da vitrine.
 *
 * Toda a mecânica é preservada: debounce de 250ms, /api/vitrine/busca,
 * histórico em localStorage, populares via /api/vitrine/mais-vendidos e a
 * navegação para produto/categoria/marca. O que muda é a apresentação —
 * campo em pílula dentro do cabeçalho escuro e painel de sugestões com a
 * mesma hierarquia visual das demais superfícies da loja.
 */
export default function BuscaPremium({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState<SugestaoProduto[]>([]);
  const [categorias, setCategoriasSug] = useState<SugestaoCategoria[]>([]);
  const [marcas, setMarcasSug] = useState<SugestaoMarca[]>([]);
  const [historico, setHistorico] = useState<string[]>([]);
  const [populares, setPopulares] = useState<SugestaoProduto[]>([]);
  const [imgFalhou, setImgFalhou] = useState<Record<string, boolean>>({});
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    const h = localStorage.getItem(STORAGE_KEY);
    if (h) setHistorico(JSON.parse(h).slice(0, 5));
    // Carregar populares ao montar
    fetch('/api/vitrine/mais-vendidos').then(r => r.json()).then(d => setPopulares(d.produtos?.slice(0, 6) || []));
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscar = useCallback(async (query: string) => {
    if (query.length < 2) { setProdutos([]); setCategoriasSug([]); setMarcasSug([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/vitrine/busca?q=${encodeURIComponent(query)}`);
      if (r.ok) {
        const data = await r.json();
        setProdutos(data.sugestoes || []);
        setCategoriasSug(data.categoriasSug || []);
        setMarcasSug(data.marcasSug || []);
      }
    } catch { /* segue com a lista anterior */ }
    setLoading(false);
  }, []);

  function onChange(val: string) {
    setQ(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(val), 250);
  }

  function salvarHistorico(query: string) {
    const h = localStorage.getItem(STORAGE_KEY);
    const arr = h ? JSON.parse(h) : [];
    const updated = [query, ...arr.filter((x: string) => x !== query)].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setHistorico(updated.slice(0, 5));
  }

  function search(query?: string) {
    const term = (query || q).trim();
    if (!term) return;
    salvarHistorico(term);
    setShow(false);
    router.push(`/vitrine/busca?q=${encodeURIComponent(term)}`);
  }

  function irProduto(id: string) { setShow(false); setQ(''); router.push(`/vitrine/produto/${id}`); }
  function irCategoria(slug: string) { setShow(false); setQ(''); router.push(`/vitrine/catalogo?categoria=${slug}`); }
  function irMarca(nome: string) { setShow(false); setQ(''); router.push(`/vitrine/busca?marca=${encodeURIComponent(nome)}`); }

  const temResultados = produtos.length > 0 || categorias.length > 0 || marcas.length > 0;
  const mostrarHistorico = !q.trim() && historico.length > 0;
  const mostrarPopulares = !q.trim() && populares.length > 0;

  return (
    <div ref={ref} className={`mv-search ${className}`}>
      <div className="mv-search-field">
        <svg className="w-4 h-4 text-[#a9b6ca] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={q}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          onFocus={() => setShow(true)}
          placeholder="Buscar peça, marca ou modelo da moto…"
          className="mv-search-input"
          aria-label="Buscar produtos"
        />
        {loading && <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white animate-spin flex-shrink-0" />}
        <button onClick={() => search()} className="mv-search-submit" aria-label="Buscar">
          <span>Buscar</span>
          <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {show && (
        <div className="mv-suggest">
          {/* Histórico de buscas */}
          {mostrarHistorico && (
            <div className="mv-suggest-group">
              <p className="mv-suggest-head">Buscas recentes</p>
              <div className="flex flex-wrap gap-1.5">
                {historico.map((h, i) => (
                  <button key={i} onClick={() => { setQ(h); buscar(h); }} className="mv-chip">
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Populares */}
          {mostrarPopulares && (
            <div className="mv-suggest-group">
              <p className="mv-suggest-head">Mais buscados</p>
              <div className="flex flex-col">
                {populares.slice(0, 4).map(p => (
                  <button key={p.id} onClick={() => irProduto(p.id)} className="mv-suggest-item">
                    <span className="text-xs text-[var(--mv-text-2)] truncate flex-1 text-left">{p.nome}</span>
                    <span className="text-[11px] font-bold text-[var(--mv-text)] flex-shrink-0">{fm(precoPublico(p))}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resultados da busca */}
          {q.length >= 2 && temResultados && (
            <>
              {categorias.length > 0 && (
                <div className="mv-suggest-group">
                  <p className="mv-suggest-head">Categorias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categorias.map(c => (
                      <button key={c.slug} onClick={() => irCategoria(c.slug)} className="mv-chip">
                        {c.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {marcas.length > 0 && (
                <div className="mv-suggest-group">
                  <p className="mv-suggest-head">Marcas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {marcas.map(m => (
                      <button key={m.nome} onClick={() => irMarca(m.nome)} className="mv-chip">
                        {m.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {produtos.length > 0 && (
                <div className="mv-suggest-group">
                  <p className="mv-suggest-head">Produtos</p>
                  <div className="flex flex-col gap-0.5">
                    {produtos.map(s => (
                      <button key={s.id} onClick={() => irProduto(s.id)} className="mv-suggest-item">
                        <span className="w-11 h-11 rounded-lg bg-[var(--mv-surface-2)] border border-[var(--mv-line)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.imagemUrl && !imgFalhou[s.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.imagemUrl} alt="" className="w-full h-full object-cover"
                              onError={() => setImgFalhou(prev => ({ ...prev, [s.id]: true }))} />
                          ) : (
                            <svg className="w-5 h-5 text-[var(--mv-text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </span>
                        <span className="flex-1 min-w-0 text-left">
                          <span className="block text-xs font-semibold text-[var(--mv-text)] truncate">{s.nome}</span>
                          {s.marca && <span className="block text-[10px] text-[var(--mv-text-3)] truncate">{s.marca}</span>}
                        </span>
                        <span className="text-xs font-bold text-[var(--mv-text)] flex-shrink-0">{fm(precoPublico(s))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Atalho para todos os resultados */}
          {q.length >= 2 && (
            <button onClick={() => search()}
              className="w-full py-3 bg-[var(--mv-brand-soft)] hover:bg-[#e2edfc] text-[var(--mv-brand)] text-xs font-bold transition-colors border-t border-[var(--mv-line)]">
              Ver todos os resultados para “{q.trim()}”
            </button>
          )}

          {q.length >= 2 && !temResultados && !loading && (
            <div className="py-8 text-center">
              <p className="text-xs text-[var(--mv-text-2)] font-semibold">Nenhum resultado para “{q.trim()}”</p>
              <p className="text-[11px] text-[var(--mv-text-3)] mt-1">Tente o nome da peça, a marca ou o modelo da moto.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
