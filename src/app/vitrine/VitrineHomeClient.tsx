'use client';

import { useState, useEffect } from 'react';
import CardProdutoPremium from '@/components/vitrine/CardProdutoPremium';
import BannerCarrossel from '@/components/vitrine/BannerCarrossel';
import MarcasVitrine, { MarcasGrade } from '@/components/vitrine/MarcasVitrine';
import NewsletterVitrine from '@/components/vitrine/NewsletterVitrine';
import { PromocoesBlocos } from '@/components/vitrine/PromocoesVitrine';
import SecaoVitrine from '@/components/vitrine/SecaoVitrine';
import { getClienteVitrine } from '@/lib/vitrine-session';
import { DADOS_OFICINA } from '@/lib/empresa';

/**
 * Home da vitrine.
 *
 * Composição em faixas alternadas (referência: o zig-zag bento do template-sass
 * cruzado com a grade de serviços do maryane), para NÃO repetir o defeito antigo
 * de sete grades de cards exatamente iguais, uma atrás da outra:
 *
 *   hero/carrossel → atalhos → destaques (bento) → promoções → pneus
 *   → ofertas → mais vendidos → recomendados → vistos → novos
 *   → categorias → oficina → marcas → retirada na loja → newsletter
 *
 * Nenhuma seção inventa dado comercial: cada uma só aparece quando existe
 * conteúdo real vindo da API/Prisma.
 */
export default function VitrineHomeClient({ destaques, ofertas, lancamentos, pecas, categorias, categoriasVitrine }: any) {
  const [favoritos, setFavoritos] = useState<Set<string>>(new Set());
  const [cliente, setCliente] = useState<any>(null);

  // FASE 15-H.1: seções dinâmicas
  const [maisVendidos, setMaisVendidos] = useState<any[]>([]);
  const [recomendados, setRecomendados] = useState<any[]>([]);
  const [vistos, setVistos] = useState<any[]>([]);
  const [recentes, setRecentes] = useState<any[]>([]);

  useEffect(() => {
    const d = getClienteVitrine();
    if (d) {
      setCliente(d);
      fetch('/api/vitrine/favoritos', { headers: { Authorization: `Bearer ${d.token}` } })
        .then(r => r.json()).then(data => setFavoritos(new Set((Array.isArray(data) ? data : []).map((f: any) => f.pecaId))));
      fetch('/api/vitrine/historico', { headers: { Authorization: `Bearer ${d.token}` } })
        .then(r => r.json()).then(data => setVistos(data.produtos || []));
    }
  }, []);

  useEffect(() => {
    fetch('/api/vitrine/mais-vendidos').then(r => r.json()).then(d => setMaisVendidos(d.produtos || []));
    if (destaques.length > 0) {
      fetch(`/api/vitrine/recomendados?pecaId=${destaques[0].id}`).then(r => r.json()).then(d => setRecomendados(d.produtos || []));
    }
  }, [destaques]);

  useEffect(() => {
    setRecentes(pecas.slice(-8).reverse());
  }, [pecas]);

  async function toggleFavorito(pecaId: string) {
    if (!cliente) return;
    await fetch('/api/vitrine/favoritos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cliente.token}` },
      body: JSON.stringify({ pecaId }),
    });
    setFavoritos(prev => {
      const n = new Set(prev);
      n.has(pecaId) ? n.delete(pecaId) : n.add(pecaId);
      return n;
    });
  }

  // Menu/categorias 100% data-driven. `categoriasVitrine` vem do endpoint
  // /api/vitrine/categorias, que já filtra SÓ categorias com produtos visíveis
  // (ativo && quantidadeLoja>0 && precoVenda>0) e ordena CAPACETES→CAPAS→ACESSÓRIOS→A-Z.
  // Fallback (defensivo): deriva do payload de peças caso a prop venha vazia.
  const catsMenu = (categoriasVitrine && categoriasVitrine.length > 0)
    ? categoriasVitrine
    : categorias.filter((c: any) => pecas.some((p: any) => p.categoria.slug === c.slug));

  // Atalhos rápidos: as 4 primeiras categorias reais (nunca slugs fixos).
  const atalhos = catsMenu.slice(0, 4);

  const contarCategoria = (slug: string) => {
    const c = catsMenu.find((x: any) => x.slug === slug);
    return c?.totalProdutos ?? pecas.filter((p: any) => p.categoria.slug === slug).length;
  };

  /**
   * Vitrine de produtos. `forma` é o RITMO da home, não uma variação de preço:
   *   • carrossel → trilho que continua trilho no desktop (pneus, mais vendidos);
   *   • grade     → grade completa (usada uma vez só, para não repetir a mesma
   *                 parede de cards em toda a página).
   * A lógica do card é sempre a mesma (preço público, estoque da loja, favoritos).
   */
  const grade = (lista: any[], forma: 'carrossel' | 'grade' = 'carrossel') => (
    <div className={forma === 'grade' ? 'mv-grid' : 'mv-carrossel'}>
      {lista.map((p: any) => (
        <CardProdutoPremium key={p.id} p={p} onFavorito={cliente ? toggleFavorito : undefined} favorited={favoritos.has(p.id)} />
      ))}
    </div>
  );

  return (
    <>
      {/* CAPA — carrossel data-driven da DONA (ou hero próprio se não houver banner) */}
      <BannerCarrossel />

      {/* ATALHOS RÁPIDOS — navegação de 1 toque para as principais categorias */}
      {atalhos.length > 0 && (
        <div className="mv-container -mt-5 md:-mt-7 relative z-10">
          <div className="mv-quick">
            {atalhos.map((c: any) => (
              <a key={c.slug} href={`/vitrine/catalogo?categoria=${c.slug}`} className="mv-quick-item">
                <span className="w-9 h-9 rounded-lg bg-[var(--mv-brand-soft)] text-[var(--mv-brand)] flex items-center justify-center flex-shrink-0 font-extrabold text-sm overflow-hidden">
                  {c.icone
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.icone} alt="" className="w-full h-full object-cover" />
                    : String(c.nome).charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-[var(--mv-text)] truncate">{c.nome}</span>
                  <span className="block text-[10px] text-[var(--mv-text-3)]">{contarCategoria(c.slug)} produtos</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mv-container">

        {/* DESTAQUES — bento: o principal ganha escala, os outros acompanham.
            É o que quebra a leitura "grade de cards idênticos". */}
        {destaques.length > 0 && (
          <section className="mv-section">
            <div className="mv-sec-head">
              <div>
                <h2 className="mv-sec-title">Produtos em destaque</h2>
                <p className="mv-sec-sub">Selecionados pela loja</p>
              </div>
              <a href="/vitrine/catalogo" className="mv-sec-link">
                Ver catálogo
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
              </a>
            </div>
            <div className="mv-bento">
              {destaques.slice(0, 5).map((p: any, i: number) => (
                <CardProdutoPremium key={p.id} p={p} feature={i === 0}
                  onFavorito={cliente ? toggleFavorito : undefined} favorited={favoritos.has(p.id)} />
              ))}
            </div>
          </section>
        )}

        {/* PROMOÇÕES */}
        <section className="mv-section">
          <div className="mv-sec-head">
            <div>
              <h2 className="mv-sec-title">Promoções</h2>
              <p className="mv-sec-sub">Por tempo limitado</p>
            </div>
            <a href="/vitrine/promocoes" className="mv-sec-link">
              Ver todas
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
          <PromocoesBlocos modo="compacto" />
        </section>

        {/* FAIXA PNEUS */}
        <div className="mv-strip mv-strip-ink mv-section">
          <div className="flex-1 min-w-0">
            <span className="mv-eyebrow">Rodas e pneus</span>
            <h2 className="text-xl md:text-2xl font-extrabold mt-3 leading-tight">Pneus para sua moto</h2>
            <p className="text-sm text-[var(--mv-text-on-dark-2)] mt-2 max-w-md leading-relaxed">
              Trabalhamos com as principais marcas. Não sabe qual é o seu? Fale com a loja e a gente confirma a medida.
            </p>
            <a href="/vitrine/busca?q=pneu" className="mv-btn mv-btn-primary mt-5">Ver pneus</a>
          </div>
          <span className="hidden md:flex w-28 h-28 lg:w-32 lg:h-32 rounded-full border border-white/10 items-center justify-center flex-shrink-0">
            <svg className="w-14 h-14 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth={1} />
              <circle cx="12" cy="12" r="3.5" strokeWidth={1} />
              <path strokeLinecap="round" strokeWidth={1} d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            </svg>
          </span>
        </div>

        {/* RITMO DA HOME
            As vitrines eram cinco seções idênticas de grade 4 colunas, uma atrás
            da outra. Agora alternam TRÊS formas:
              • faixa branca (.mv-band) com dois trilhos   → Ofertas + Mais vendidos
              • grade completa                             → Recomendados (uma só vez)
              • faixa branca com dois trilhos              → Vistos + Chegaram agora
            Só a composição mudou: cada item continua vindo da mesma API e usando
            a mesma regra de preço/estoque do card. */}

        {/* FAIXA 1 — OFERTAS + MAIS VENDIDOS */}
        {(ofertas.length > 0 || maisVendidos.length > 0) && (
          <div className="mv-band">
            {ofertas.length > 0 && (
              <SecaoVitrine>
                <div className="mv-sec-head">
                  <div>
                    <h2 className="mv-sec-title">Ofertas</h2>
                    <p className="mv-sec-sub">{ofertas.length} {ofertas.length === 1 ? 'item com desconto' : 'itens com desconto'}</p>
                  </div>
                  <a href="/vitrine/catalogo?promocao=1" className="mv-sec-link">
                    Ver todas
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
                  </a>
                </div>
                {grade(ofertas)}
              </SecaoVitrine>
            )}

            {maisVendidos.length > 0 && (
              <SecaoVitrine>
                <div className="mv-sec-head">
                  <div>
                    <h2 className="mv-sec-title">Mais vendidos</h2>
                    <p className="mv-sec-sub">O que sai mais na loja</p>
                  </div>
                  <a href="/vitrine/catalogo?ordem=mais_vendidos" className="mv-sec-link">
                    Ver catálogo
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
                  </a>
                </div>
                {grade(maisVendidos)}
              </SecaoVitrine>
            )}
          </div>
        )}

        {/* RECOMENDADOS — a única GRADE COMPLETA da home. É o contraponto de
            largura às faixas de trilho, e por isso não se repete. (Só aparece
            para quem está logado e tem histórico.) */}
        {recomendados.length > 0 && (
          <SecaoVitrine>
            <div className="mv-sec-head">
              <div>
                <h2 className="mv-sec-title">Recomendados para você</h2>
                <p className="mv-sec-sub">Com base nos seus interesses</p>
              </div>
            </div>
            {grade(recomendados, 'grade')}
          </SecaoVitrine>
        )}

        {/* FAIXA 2 — O QUE É SEU: vistos recentemente + últimas peças cadastradas */}
        {(vistos.length > 0 || recentes.length > 0) && (
          <div className="mv-band">
            {vistos.length > 0 && (
              <SecaoVitrine>
                <div className="mv-sec-head">
                  <div>
                    <h2 className="mv-sec-title">Vistos recentemente</h2>
                    <p className="mv-sec-sub">Continue de onde parou</p>
                  </div>
                  <a href="/vitrine/perfil" className="mv-sec-link">
                    Meu perfil
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
                  </a>
                </div>
                {grade(vistos)}
              </SecaoVitrine>
            )}

            {recentes.length > 0 && (
              <SecaoVitrine>
                <div className="mv-sec-head">
                  <div>
                    <h2 className="mv-sec-title">Chegaram agora</h2>
                    <p className="mv-sec-sub">Últimas peças cadastradas</p>
                  </div>
                  <a href="/vitrine/catalogo?ordem=mais_recentes" className="mv-sec-link">
                    Ver todos
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
                  </a>
                </div>
                {grade(recentes)}
              </SecaoVitrine>
            )}
          </div>
        )}

        {/* CATEGORIAS */}
        {catsMenu.length > 0 && (
          <section className="mv-section">
            <div className="mv-sec-head">
              <div>
                <h2 className="mv-sec-title">Navegue por categoria</h2>
                <p className="mv-sec-sub">Todas as categorias com peças disponíveis</p>
              </div>
            </div>
            {/* Lista de diretório (e não outro mural de quadradinhos: os atalhos
                logo abaixo do hero já usam esse desenho). */}
            <div className="mv-cat-dir">
              {catsMenu.map((c: any) => {
                // Contagem real via endpoint de categorias (independe do take de /api/vitrine).
                const count = c.totalProdutos ?? pecas.filter((p: any) => p.categoria.slug === c.slug).length;
                return (
                  <a key={c.slug} href={`/vitrine/catalogo?categoria=${c.slug}`} className="mv-cat-row">
                    <span className="mv-cat-icon">
                      {c.icone
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={c.icone} alt="" className="w-full h-full object-cover" />
                        : String(c.nome).charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold text-[var(--mv-text)] leading-tight truncate">{c.nome}</span>
                      <span className="block text-[11px] text-[var(--mv-text-3)] mt-0.5">{count} {count === 1 ? 'produto' : 'produtos'}</span>
                    </span>
                    <svg className="w-4 h-4 flex-none text-[var(--mv-text-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* FAIXA OFICINA */}
        <div className="mv-strip mv-strip-gold mv-section">
          <div className="flex-1 min-w-0">
            <span className="mv-eyebrow" style={{ color: '#fff8ea', borderColor: 'rgba(255,255,255,0.25)' }}>Oficina</span>
            <h2 className="text-xl md:text-2xl font-extrabold mt-3 leading-tight">Precisa de mão de obra também?</h2>
            <p className="text-sm text-white/85 mt-2 max-w-md leading-relaxed">
              A loja conta com oficina para instalação e manutenção. Fale com a gente e agende o serviço.
            </p>
            <a href={`https://wa.me/${DADOS_OFICINA.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de agendar um serviço na oficina.')}`}
              target="_blank" rel="noopener noreferrer"
              className="mv-btn mt-5 bg-white text-[#7a4408] hover:bg-[#fff8ea]">
              Falar com a oficina
            </a>
          </div>
        </div>

        {/* MARCAS */}
        <section className="mv-section">
          <div className="mv-sec-head">
            <div>
              <h2 className="mv-sec-title">Marcas</h2>
              <p className="mv-sec-sub">Trabalhamos com as principais do mercado</p>
            </div>
            <a href="/vitrine/marcas" className="mv-sec-link">
              Ver todas
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
            </a>
          </div>
          <MarcasGrade limite={6} />
        </section>

        {/* COMO FUNCIONA A RETIRADA — 3 passos, sem inventar política nova */}
        <section className="mv-section">
          <div className="mv-panel !p-6 md:!p-10">
            <div className="mv-sec-head">
              <div>
                <h2 className="mv-sec-title">Como funciona</h2>
                <p className="mv-sec-sub">Compra online, retirada na loja</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {[
                { n: '1', t: 'Escolha as peças', d: 'Navegue pelo catálogo e monte seu pedido no carrinho.' },
                { n: '2', t: 'Confirme o pedido', d: 'Informe quem vai retirar e escolha a forma de pagamento na retirada.' },
                { n: '3', t: 'Retire na loja', d: 'A separação leva até 2 horas. Você recebe o código de retirada no perfil.' },
              ].map(passo => (
                <div key={passo.n} className="flex gap-4">
                  <span className="w-10 h-10 rounded-full bg-[var(--mv-brand)] text-white font-extrabold flex items-center justify-center flex-shrink-0">{passo.n}</span>
                  <span>
                    <span className="block text-sm font-bold text-[var(--mv-text)]">{passo.t}</span>
                    <span className="block text-xs text-[var(--mv-text-2)] mt-1 leading-relaxed">{passo.d}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-7 pt-6 border-t border-[var(--mv-line)] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--mv-text-2)]">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--mv-brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {DADOS_OFICINA.endereco} — {DADOS_OFICINA.cidade}
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[var(--mv-brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v5l3 2" /></svg>
                {DADOS_OFICINA.horario}
              </span>
              <a href="/vitrine/carrinho" className="mv-btn mv-btn-primary ml-auto">Montar meu pedido</a>
            </div>
          </div>
        </section>

        {/* NEWSLETTER */}
        <div className="mv-section">
          <NewsletterVitrine />
        </div>
      </div>
    </>
  );
}
