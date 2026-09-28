'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { rotuloAtributosAcessorio } from '@/lib/vitrine-utils';
import { useCarrinhoVitrine } from './CarrinhoIcone';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Produto {
  id: string; nome: string; codigo: string; precoVenda: number; precoOferta?: number; precoVitrine?: number;
  quantidade?: number; quantidadeLoja?: number; estoqueMinimo?: number; vitrine?: boolean; destaque?: boolean; oferta?: boolean;
  marca?: string; compatibilidade?: string; imagemUrl?: string; descricaoCurta?: string;
  subcategoria?: string; tamanho?: string | null; genero?: string | null;
  categoria: { nome: string; slug: string }; createdAt?: string;
}

// Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda. Só leitura na Vitrine.
function precoExibicao(p: Produto): number {
  const pv = p.precoVitrine != null ? Number(p.precoVitrine) : NaN;
  if (Number.isFinite(pv) && pv > 0) return pv;
  if (p.oferta && p.precoOferta && Number(p.precoOferta) < Number(p.precoVenda)) return Number(p.precoOferta);
  return Number(p.precoVenda) || 0;
}

/**
 * Card de produto da vitrine.
 *
 * Toda a regra comercial permanece idêntica: preço público (precoVitrine >
 * precoOferta > precoVenda), disponibilidade pelo estoque da LOJA
 * (quantidadeLoja — o estoque central nunca é exibido), limite de quantidade
 * ao adicionar, favoritos e comparação.
 *
 * O que muda é a apresentação: hierarquia de preço mais forte, marca e
 * atributo legíveis, selos com cor por significado e dois caminhos de compra
 * (carrinho / comprar) que caibam até em 2 colunas no celular.
 */
export default function CardProdutoPremium({
  p, onFavorito, favorited, onCarrinho, compact, onComparar, comparado, feature
}: {
  p: Produto; onFavorito?: (id: string) => void; favorited?: boolean; onCarrinho?: (p: Produto) => void; compact?: boolean;
  onComparar?: (id: string) => void; comparado?: boolean;
  /** Variante para o painel principal do bento da Home (mesma lógica, escala maior). */
  feature?: boolean;
}) {
  const router = useRouter();
  const { adicionar } = useCarrinhoVitrine();
  const [imgError, setImgError] = useState(false);
  const [adicionado, setAdicionado] = useState(false);
  const [erro, setErro] = useState('');
  const precoBase = Number(p.precoVenda);
  const precoAtual = precoExibicao(p);
  // O desconto do card segue a MESMA regra da página do produto: aparece sempre
  // que o preço público for menor que o de estoque — tanto na oferta normal
  // quanto no preço especial cadastrado pela DONA (precoVitrine). Antes o card
  // só considerava a oferta e ficava sem selo justamente nos itens com preço
  // especial, enquanto a página do produto mostrava o desconto.
  const temDesconto = precoAtual > 0 && precoAtual < precoBase;
  const economia = temDesconto ? precoBase - precoAtual : 0;
  const desconto = temDesconto ? Math.round((economia / precoBase) * 100) : 0;
  // Disponibilidade baseada no estoque da LOJA (quantidadeLoja). Nunca expor o estoque central.
  const qtdLoja = p.quantidadeLoja ?? 0;
  const disponivel = qtdLoja > 0;
  const ultimasUnidades = qtdLoja > 0 && qtdLoja <= 5;
  const novo = p.createdAt ? (new Date().getTime() - new Date(p.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 : false;
  const atributo = rotuloAtributosAcessorio(p);

  // AJUSTE 7: adicionar ao carrinho respeitando o estoque da LOJA; COMPRAR adiciona e vai ao carrinho.
  function adicionarAoCarrinho(e?: React.MouseEvent) {
    e?.preventDefault();
    const limite = p.quantidadeLoja ?? 0;
    const jaNoCarrinho = JSON.parse(sessionStorage.getItem('marquinho-cart') || '[]')
      .find((i: any) => i.peca.id === p.id)?.quantidade || 0;
    if (limite > 0 && jaNoCarrinho >= limite) {
      setErro('Quantidade máxima em estoque (loja) atingida.');
      setTimeout(() => setErro(''), 2500);
      return;
    }
    if (onCarrinho) { onCarrinho(p); }
    else adicionar(p);
    setAdicionado(true);
    setErro('');
    setTimeout(() => setAdicionado(false), 1800);
  }

  function comprar(e: React.MouseEvent) {
    e.preventDefault();
    const limite = p.quantidadeLoja ?? 0;
    const jaNoCarrinho = JSON.parse(sessionStorage.getItem('marquinho-cart') || '[]')
      .find((i: any) => i.peca.id === p.id)?.quantidade || 0;
    if (limite > 0 && jaNoCarrinho >= limite) {
      setErro('Quantidade máxima em estoque (loja) atingida.');
      setTimeout(() => setErro(''), 2500);
      return;
    }
    if (onCarrinho) { onCarrinho(p); }
    else adicionar(p);
    router.push('/vitrine/carrinho');
  }

  return (
    <div className={`group flex flex-col bg-[var(--mv-surface)] border border-[var(--mv-line)] rounded-2xl overflow-hidden transition-all duration-200 hover:border-[var(--mv-brand-line)] hover:shadow-[var(--mv-sh-md)] hover:-translate-y-0.5 ${feature ? 'mv-feature h-full' : ''}`}>

      {/* Imagem */}
      <a href={`/vitrine/produto/${p.id}`} className={`relative block bg-[var(--mv-surface-2)] overflow-hidden ${feature ? 'mv-feature-img' : 'aspect-square'}`}>
        {!imgError && p.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagemUrl} alt={p.nome}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
            onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <span className="w-full h-full flex items-center justify-center">
            <svg className="w-11 h-11 text-[var(--mv-line-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
        )}

        {/* Selos — um por significado, no máximo três visíveis */}
        <span className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {!disponivel && <span className="mv-badge mv-badge-ink">Indisponível</span>}
          {disponivel && temDesconto && <span className="mv-badge mv-badge-alert">{desconto}% OFF</span>}
          {disponivel && !temDesconto && p.destaque && <span className="mv-badge mv-badge-gold">Destaque</span>}
          {disponivel && !temDesconto && !p.destaque && novo && <span className="mv-badge mv-badge-brand">Novo</span>}
          {disponivel && ultimasUnidades && !temDesconto && <span className="mv-badge mv-badge-ink">Últimas un.</span>}
        </span>

        {/* Ações sobre a imagem */}
        <span className="absolute top-2 right-2 flex flex-col gap-1">
          {onFavorito && (
            <button
              onClick={(e) => { e.preventDefault(); onFavorito(p.id); }}
              aria-label={favorited ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
              className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm border border-[var(--mv-line)] flex items-center justify-center transition-all hover:scale-110 shadow-[var(--mv-sh-xs)]">
              <svg className={`w-4 h-4 ${favorited ? 'text-[#d92d20]' : 'text-[var(--mv-text-3)]'}`}
                fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
          {onComparar && (
            <button
              onClick={(e) => { e.preventDefault(); onComparar(p.id); }}
              aria-label={comparado ? 'Remover da comparação' : 'Comparar produto'}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all hover:scale-110 shadow-[var(--mv-sh-xs)] ${
                comparado
                  ? 'bg-[var(--mv-brand)] border-[var(--mv-brand)] text-white'
                  : 'bg-white/95 backdrop-blur-sm border-[var(--mv-line)] text-[var(--mv-text-3)]'
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
          )}
        </span>
      </a>

      {/* Conteúdo */}
      <div className={`flex-1 flex flex-col p-3 ${compact ? 'gap-1' : 'gap-1.5'}`}>
        {p.marca && (
          <p className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-[var(--mv-brand)] truncate">{p.marca}</p>
        )}

        <a href={`/vitrine/produto/${p.id}`}
          className={`font-semibold text-[var(--mv-text)] leading-snug line-clamp-2 hover:text-[var(--mv-brand)] transition-colors ${feature ? 'mv-feature-nome text-sm' : 'text-[13px]'}`}>
          {p.nome}
        </a>

        {!compact && (
          <p className="text-[11px] text-[var(--mv-text-3)] truncate">
            {p.categoria.nome}{atributo ? ` · ${atributo}` : ''}{p.compatibilidade ? ` · ${p.compatibilidade}` : ''}
          </p>
        )}

        {!compact && disponivel && (
          <p className="text-[11px] font-semibold flex items-center gap-1.5 text-[#0a6b3d]">
            <span className={`w-1.5 h-1.5 rounded-full ${ultimasUnidades ? 'bg-[#e8991a]' : 'bg-[#0f9d58]'}`} />
            {ultimasUnidades ? 'Últimas unidades' : 'Em estoque'}
          </p>
        )}

        {/* Preço — empurrado para o rodapé do card para alinhar a grade inteira */}
        <div className="mt-auto pt-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={`mv-price ${feature ? 'mv-feature-preco' : ''}`}>{fm(precoAtual)}</span>
            {temDesconto && <span className="mv-price-old">{fm(precoBase)}</span>}
          </div>
        </div>

        {erro && <p className="text-[11px] text-[#d92d20] font-medium">{erro}</p>}

        {/* Dois caminhos de compra */}
        {disponivel ? (
          <div className="flex gap-1.5 mt-1">
            <button onClick={adicionarAoCarrinho} aria-label="Adicionar ao carrinho"
              className={`mv-btn mv-btn-ghost !px-3 flex-shrink-0 ${adicionado ? 'mv-btn-added' : ''}`}>
              {adicionado ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
                </svg>
              )}
              <span className="hidden sm:inline">{adicionado ? 'Adicionado' : 'Carrinho'}</span>
            </button>
            <button onClick={comprar} className="mv-btn mv-btn-primary flex-1 min-w-0">
              Comprar
            </button>
          </div>
        ) : (
          <button disabled className="mv-btn mv-btn-ghost w-full mt-1">Indisponível</button>
        )}
      </div>
    </div>
  );
}
