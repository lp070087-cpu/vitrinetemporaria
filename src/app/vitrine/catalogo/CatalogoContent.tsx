'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import CardProdutoPremium from '@/components/vitrine/CardProdutoPremium';
import ListaProdutoPremium from '@/components/vitrine/ListaProdutoPremium';
import FiltrosBarra from '@/components/vitrine/FiltrosBarra';
import ComparadorVitrine from '@/components/vitrine/ComparadorVitrine';

const POR_PAGINA = 24;

/**
 * Catálogo / busca.
 *
 * A tela usa DUAS apresentações do MESMO FiltrosBarra:
 *  • Desktop (≥1024px): painel fixo na coluna da esquerda (acompanha a rolagem);
 *  • Celular: gaveta inferior (`.mv-drawer`) aberta pelo botão "Filtros".
 * Um componente só, duas molduras — nenhuma regra de filtragem duplicada.
 *
 * Nada da lógica mudou: os mesmos parâmetros vão para /api/vitrine/busca, as
 * pastas de subcategoria continuam data-driven e o comparador segue limitado a 4.
 */
export default function CatalogoContent() {
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [marcas, setMarcas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<{ slug: string; nome: string; subcategorias?: { slug: string; nome: string; totalProdutos?: number }[] }[]>([]);
  const [filtros, setFiltros] = useState({
    marca: searchParams.get('marca') || '',
    categoria: searchParams.get('categoria') || '',
    precoMin: '', precoMax: '', promocao: false,
    compatibilidade: '', subcategoria: '',
  });
  const [ordem, setOrdem] = useState('relevancia');
  const [mode, setMode] = useState<'grid' | 'list'>('grid');
  const [comparar, setComparar] = useState<any[]>([]);
  const [showComparador, setShowComparador] = useState(false);
  const [drawerAberto, setDrawerAberto] = useState(false);
  // AJUSTE 1 — pastas de subcategorias na vitrine pública. Quando a categoria tem
  // subcategorias, mostra pastas 📁 antes de abrir os produtos direto.
  const [verTodosPasta, setVerTodosPasta] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const q = searchParams.get('q');
      if (q) params.set('q', q);
      // Subcategoria selecionada → parâmetro próprio `subcategoria` (a API distingue
      // categoria real de tipo de acessório via prefixo `tipo:`). Se não, usa a categoria.
      if (filtros.subcategoria) params.set('subcategoria', filtros.subcategoria);
      else if (filtros.categoria) params.set('categoria', filtros.categoria);
      if (filtros.marca) params.set('marca', filtros.marca);
      if (filtros.compatibilidade) params.set('compatibilidade', filtros.compatibilidade);
      // Filtros de preço/promoção (antes eram estado morto — nunca enviados à API)
      if (filtros.precoMin) params.set('precoMin', filtros.precoMin);
      if (filtros.precoMax) params.set('precoMax', filtros.precoMax);
      if (filtros.promocao) params.set('promocao', '1');
      params.set('ordem', ordem);
      params.set('page', String(pagina));

      const r = await fetch(`/api/vitrine/busca?${params}`);
      if (r.ok) {
        const d = await r.json();
        setProdutos(d.produtos);
        setTotal(d.total);
        setMarcas(d.marcas || []);
      }
    } catch {}
    setLoading(false);
  }, [searchParams, filtros, ordem, pagina]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // AJUSTE 1 — trocou de categoria (ou escolheu subcategoria) → volta às pastas / sai delas corretamente.
  const catSlugAtual = filtros.categoria;
  useEffect(() => { setVerTodosPasta(false); }, [catSlugAtual]);

  // Trava a rolagem do fundo enquanto a gaveta de filtros está aberta (celular).
  useEffect(() => {
    if (!drawerAberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, [drawerAberto]);

  useEffect(() => {
    // Item 1: categorias do filtro 100% data-driven (só categorias com produtos visíveis).
    fetch('/api/vitrine/categorias').then(r => r.json()).then((d: any[]) => {
      if (Array.isArray(d)) setCategorias(d.map((c: any) => ({ slug: c.slug, nome: c.nome, subcategorias: (c.subcategorias || []).map((s: any) => ({ slug: s.slug, nome: s.nome, totalProdutos: s.totalProdutos })) })));
    });
  }, []);

  // AJUSTE 1 — pasta de subcategorias da categoria ativa (data-driven da API pública).
  // NUNCA usa Categoria.parentId para isso — usa as subcategorias reais derivadas de
  // Peca.subcategoria que a API /api/vitrine/categorias já devolve com totalProdutos.
  const catAtivaPasta = categorias.find(c => c.slug === filtros.categoria);
  const pastasDaCategoria = (catAtivaPasta?.subcategorias || []).filter(s => (s.totalProdutos ?? 0) > 0);
  // Nesta visão de pastas, ainda não há subcategoria escolhida.
  const mostrandoPastas = !filtros.subcategoria && pastasDaCategoria.length > 0 && !verTodosPasta;

  const q = searchParams.get('q');
  const marcaUrl = searchParams.get('marca');
  const titulo = q
    ? `Busca: “${q}”`
    : marcaUrl
      ? `Marca: ${marcaUrl}`
      : catAtivaPasta?.nome || 'Catálogo de produtos';

  function toggleComparar(id: string) {
    setComparar(prev => {
      if (prev.find(p => p.id === id)) return prev.filter(p => p.id !== id);
      if (prev.length >= 4) return prev;
      const prod = produtos.find(p => p.id === id);
      return prod ? [...prev, prod] : prev;
    });
  }

  function limpar() {
    setFiltros({ marca: '', categoria: '', precoMin: '', precoMax: '', promocao: false, compatibilidade: '', subcategoria: '' });
    setPagina(1);
    setVerTodosPasta(false);
    // `q` e `marca` vivem na URL — só saem recarregando o catálogo limpo.
    if (q || marcaUrl) window.location.href = '/vitrine/catalogo';
  }

  const totalPaginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const filtrosAtivos = [filtros.categoria, filtros.subcategoria, filtros.marca, filtros.compatibilidade, filtros.precoMin, filtros.precoMax].filter(Boolean).length + (filtros.promocao ? 1 : 0);

  return (
    <div className="mv-container mv-section">

      {/* MIGALHAS + CABEÇALHO DA LISTA */}
      <nav className="mv-crumbs mb-3" aria-label="Você está aqui">
        <a href="/vitrine">Início</a>
        <span>/</span>
        <span className="text-[var(--mv-text-2)]">{titulo}</span>
      </nav>

      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--mv-text)]">{titulo}</h1>
          <p className="text-sm text-[var(--mv-text-2)] mt-1.5">
            {loading ? 'Buscando produtos…' : `${total} ${total === 1 ? 'produto encontrado' : 'produtos encontrados'}`}
          </p>
        </div>

        {/* Barra de ações: filtros (celular) + ordenação */}
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => setDrawerAberto(true)}
            className="mv-toggle lg:hidden">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" /></svg>
            Filtros
            {filtrosAtivos > 0 && (
              <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--mv-brand)] text-white text-[10px] font-extrabold flex items-center justify-center">{filtrosAtivos}</span>
            )}
          </button>

          <label className="flex items-center gap-2 mv-toggle cursor-pointer">
            <span className="text-[var(--mv-text-3)] font-bold uppercase tracking-wider text-[10px]">Ordenar</span>
            <select value={ordem} onChange={e => { setOrdem(e.target.value); setPagina(1); }}
              className="bg-transparent border-0 outline-none font-bold text-[var(--mv-text)] cursor-pointer pr-1">
              <option value="relevancia">Relevância</option>
              <option value="menor_preco">Menor preço</option>
              <option value="maior_preco">Maior preço</option>
              <option value="mais_recentes">Mais recentes</option>
              <option value="maior_desconto">Maior desconto</option>
              <option value="mais_vendidos">Mais vendidos</option>
            </select>
          </label>
        </div>
      </div>

      {/* Comparador já aberto */}
      {showComparador && comparar.length > 0 && (
        <ComparadorVitrine produtos={comparar} onClose={() => setShowComparador(false)} />
      )}

      <div className="lg:grid lg:grid-cols-[236px_minmax(0,1fr)] lg:gap-8 lg:items-start">

        {/* PAINEL DE FILTROS — só desktop; no celular vive na gaveta.
            `--mv-header-total` é a altura REAL do cabeçalho preso (as três
            faixas somadas). Com `--mv-header-h` o painel subia por baixo do
            cabeçalho e o começo da lista de filtros ficava escondido. */}
        <aside className="hidden lg:block lg:sticky"
          style={{
            zIndex: 'var(--mv-z-sticky)',
            top: 'calc(var(--mv-header-total) + 16px)',
            maxHeight: 'calc(100vh - var(--mv-header-total) - 32px)',
            overflowY: 'auto',
          }}>
          <div className="mv-filter-deck p-5">
            <FiltrosBarra categorias={categorias} marcas={marcas} filtros={filtros} onChange={setFiltros}
              mode={mode} onModeChange={setMode} onLimpar={limpar} />
          </div>
        </aside>

        <div>
          {/* GAVETA DE FILTROS (celular) */}
          {drawerAberto && (
            <>
              <div className="mv-drawer-backdrop" onClick={() => setDrawerAberto(false)} />
              <div className="mv-drawer" role="dialog" aria-modal="true" aria-label="Filtros">
                <div className="sticky top-0 bg-[var(--mv-surface)] border-b border-[var(--mv-line)] px-5 py-4 flex items-center justify-between z-10 rounded-t-[var(--mv-r-xl)]">
                  <p className="font-extrabold text-[var(--mv-text)]">Filtros</p>
                  <button type="button" onClick={() => setDrawerAberto(false)} aria-label="Fechar filtros"
                    className="w-8 h-8 rounded-lg hover:bg-[var(--mv-surface-2)] flex items-center justify-center text-[var(--mv-text-2)]">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-5 pb-8">
                  <FiltrosBarra categorias={categorias} marcas={marcas} filtros={filtros}
                    onChange={f => { setFiltros(f); setPagina(1); }} onLimpar={limpar} />
                </div>
                <div className="sticky bottom-0 bg-[var(--mv-surface)] border-t border-[var(--mv-line)] p-4">
                  <button type="button" onClick={() => setDrawerAberto(false)} className="mv-btn mv-btn-primary mv-btn-block mv-btn-lg">
                    Ver {total} {total === 1 ? 'produto' : 'produtos'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* AJUSTE 1 — PASTAS DE SUBCATEGORIAS (vitrine pública).
              Categoria com subcategorias → NÃO abre produtos direto: mostra pastas 📁.
              Só pastas com produto visível (totalProdutos > 0). "Ver todos" abre a grade. */}
          {!loading && mostrandoPastas && (
            <div className="mv-panel mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <p className="text-sm font-bold text-[var(--mv-text)]">Escolha o tipo de {catAtivaPasta?.nome || 'peça'}</p>
                <button type="button" onClick={() => setVerTodosPasta(true)}
                  className="text-xs text-[var(--mv-brand)] hover:underline font-bold">Ver todos os produtos</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pastasDaCategoria.map(s => (
                  <button key={s.slug} type="button"
                    onClick={() => { setFiltros({ ...filtros, subcategoria: s.slug, categoria: filtros.categoria }); setPagina(1); }}
                    className="mv-cat-card group">
                    <span className="mv-cat-icon">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                      </svg>
                    </span>
                    <span className="text-xs font-bold text-[var(--mv-text)] leading-tight text-center">{s.nome}</span>
                    <span className="text-[10px] text-[var(--mv-text-3)]">{s.totalProdutos ?? 0} produto{(s.totalProdutos ?? 0) !== 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AJUSTE 1 — "← Voltar para as pastas" quando está dentro de uma pasta */}
          {!loading && filtros.subcategoria && pastasDaCategoria.length > 0 && (
            <button type="button" onClick={() => { setFiltros({ ...filtros, subcategoria: '' }); setVerTodosPasta(false); setPagina(1); }}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--mv-brand)] hover:underline font-bold mb-4">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" /></svg>
              Voltar para os tipos de {catAtivaPasta?.nome || 'acessórios'}
            </button>
          )}

          {/* RESULTADOS */}
          {loading ? (
            <div className="mv-grid-cat">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="mv-skel aspect-[3/4] rounded-[var(--mv-r-lg)]" />)}
            </div>
          ) : produtos.length === 0 ? (
            <div className="mv-empty">
              <svg className="w-10 h-10 mx-auto text-[var(--mv-line-strong)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              <p className="text-sm font-bold text-[var(--mv-text)]">Nenhum produto encontrado</p>
              <p className="text-xs text-[var(--mv-text-3)] mt-1 mb-4">Tente remover um filtro ou buscar pelo nome da peça.</p>
              <button type="button" onClick={limpar} className="mv-btn mv-btn-primary">Limpar filtros</button>
            </div>
          ) : mostrandoPastas ? (
            <div className="mv-empty">
              <p className="text-sm text-[var(--mv-text-2)] font-semibold">
                Escolha um tipo acima para ver os produtos de {catAtivaPasta?.nome || 'esta categoria'}.
              </p>
            </div>
          ) : (
            <>
              {mode === 'grid' ? (
                <div className="mv-grid-cat">
                  {produtos.map(p => <CardProdutoPremium key={p.id} p={p} onComparar={toggleComparar} comparado={comparar.some(c => c.id === p.id)} />)}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {produtos.map(p => <ListaProdutoPremium key={p.id} p={p} onComparar={toggleComparar} comparado={comparar.some(c => c.id === p.id)} />)}
                </div>
              )}

              {/* PAGINAÇÃO */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-10 flex-wrap">
                  <button type="button" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)}
                    className="mv-btn mv-btn-ghost !px-3.5">Anterior</button>

                  {/* Janela de páginas em volta da atual — nunca uma fita infinita de números. */}
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                    .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
                    .map((n, idx, arr) => (
                      <span key={n} className="flex items-center gap-1.5">
                        {idx > 0 && arr[idx - 1] !== n - 1 && <span className="text-[var(--mv-text-3)] px-1">…</span>}
                        <button type="button" onClick={() => setPagina(n)} aria-current={n === pagina ? 'page' : undefined}
                          className={`w-9 h-9 rounded-lg text-xs font-extrabold transition-colors ${
                            n === pagina ? 'bg-[var(--mv-brand)] text-white' : 'bg-[var(--mv-surface)] border border-[var(--mv-line)] text-[var(--mv-text-2)] hover:border-[var(--mv-brand-line)] hover:text-[var(--mv-brand)]'
                          }`}>{n}</button>
                      </span>
                    ))}

                  <button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)}
                    className="mv-btn mv-btn-ghost !px-3.5">Próxima</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BARRA FLUTUANTE DO COMPARADOR */}
      {comparar.length > 0 && !showComparador && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 mv-container !w-auto max-w-[92vw]">
          <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--mv-r-pill)] bg-[var(--mv-ink)] text-white shadow-[var(--mv-sh-xl)]">
            <span className="text-xs font-bold whitespace-nowrap">{comparar.length} para comparar</span>
            <button type="button" onClick={() => setShowComparador(true)} className="mv-btn mv-btn-primary !py-2 !px-4 !text-xs">Comparar</button>
            <button type="button" onClick={() => setComparar([])} aria-label="Limpar comparação"
              className="w-7 h-7 rounded-full hover:bg-white/15 flex items-center justify-center flex-none">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
