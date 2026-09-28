'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrinhoVitrine } from './CarrinhoIcone';
import { rotuloAtributosAcessorio } from '@/lib/vitrine-utils';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Produto {
  id: string; nome: string; codigo: string; precoVenda: number; precoOferta?: number; precoVitrine?: number;
  quantidade?: number; quantidadeLoja?: number; marca?: string; compatibilidade?: string; imagemUrl?: string;
  descricaoCurta?: string; subcategoria?: string; tamanho?: string | null; genero?: string | null;
  categoria: { nome: string; slug: string };
}

/**
 * Mesma regra de preço/estoque do CardProdutoPremium (precoVitrine > precoOferta >
 * precoVenda; disponibilidade SÓ pelo estoque da LOJA). Aqui muda apenas a
 * composição — linha horizontal, para leitura rápida em catálogos grandes.
 */
export default function ListaProdutoPremium({ p, onComparar, comparado }: {
  p: Produto; onComparar?: (id: string) => void; comparado?: boolean;
}) {
  const router = useRouter();
  const { adicionar } = useCarrinhoVitrine();
  const [imgError, setImgError] = useState(false);
  const [adicionado, setAdicionado] = useState(false);
  const [erro, setErro] = useState('');
  // Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda.
  const precoBase = Number(p.precoVenda);
  const temOverride = p.precoVitrine != null && Number(p.precoVitrine) > 0;
  const oferta = !temOverride && p.precoOferta && Number(p.precoOferta) > 0 && Number(p.precoOferta) < precoBase;
  const desconto = oferta ? Math.round(((precoBase - Number(p.precoOferta)) / precoBase) * 100) : 0;
  const precoAtual = temOverride ? Number(p.precoVitrine) : (oferta ? Number(p.precoOferta) : precoBase);
  // Disponibilidade pelo estoque da LOJA. Nunca expor o estoque central (quantidade).
  const disponivel = (p.quantidadeLoja ?? 0) > 0;

  // AJUSTE 7: adicionar respeitando estoque da LOJA; COMPRAR adiciona e vai ao carrinho.
  function adicionarAoCarrinho() {
    const limite = p.quantidadeLoja ?? 0;
    const jaNoCarrinho = JSON.parse(sessionStorage.getItem('marquinho-cart') || '[]')
      .find((i: any) => i.peca.id === p.id)?.quantidade || 0;
    if (limite > 0 && jaNoCarrinho >= limite) {
      setErro('Quantidade máxima em estoque (loja) atingida.');
      setTimeout(() => setErro(''), 2500);
      return;
    }
    adicionar(p);
    setAdicionado(true);
    setErro('');
    setTimeout(() => setAdicionado(false), 1800);
  }

  function comprar() {
    const limite = p.quantidadeLoja ?? 0;
    const jaNoCarrinho = JSON.parse(sessionStorage.getItem('marquinho-cart') || '[]')
      .find((i: any) => i.peca.id === p.id)?.quantidade || 0;
    if (limite > 0 && jaNoCarrinho >= limite) {
      setErro('Quantidade máxima em estoque (loja) atingida.');
      setTimeout(() => setErro(''), 2500);
      return;
    }
    adicionar(p);
    router.push('/vitrine/carrinho');
  }

  const atributos = rotuloAtributosAcessorio(p);

  return (
    <div className="mv-card !p-3 md:!p-4 flex gap-3.5 md:gap-5 group">
      {/* IMAGEM */}
      <a href={`/vitrine/produto/${p.id}`}
        className="w-24 h-24 md:w-32 md:h-32 rounded-[var(--mv-r-md)] bg-[var(--mv-surface-2)] border border-[var(--mv-line)] flex-none overflow-hidden relative">
        {p.imagemUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imagemUrl} alt={p.nome}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" loading="lazy"
            onError={() => setImgError(true)} />
        ) : (
          <span className="w-full h-full flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--mv-line-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
        )}
      </a>

      {/* INFORMAÇÃO */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {p.marca && <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mv-brand)]">{p.marca}</span>}
            {oferta && <span className="mv-badge mv-badge-alert">-{desconto}%</span>}
            {!disponivel && <span className="mv-badge mv-badge-soft">Indisponível</span>}
          </div>

          <a href={`/vitrine/produto/${p.id}`}
            className="block text-sm md:text-[0.95rem] font-bold text-[var(--mv-text)] leading-snug line-clamp-2 hover:text-[var(--mv-brand)] transition-colors">
            {p.nome}
          </a>

          {p.descricaoCurta && (
            <p className="text-xs text-[var(--mv-text-2)] mt-1.5 line-clamp-2 leading-relaxed">{p.descricaoCurta}</p>
          )}

          <p className="text-[11px] text-[var(--mv-text-3)] mt-1.5">
            {p.categoria.nome}{atributos ? ` · ${atributos}` : ''}
          </p>
        </div>

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-lg md:text-xl font-extrabold text-[var(--mv-text)] tracking-tight">{fm(precoAtual)}</span>
              {(oferta || temOverride) && <span className="mv-price-old">{fm(precoBase)}</span>}
            </div>
            {disponivel && <span className="text-[11px] font-semibold text-[var(--mv-ok)]">Em estoque</span>}
            {erro && <span className="block text-[11px] font-semibold text-[var(--mv-alert)] mt-0.5">{erro}</span>}
          </div>

          <div className="flex items-center gap-2">
            {onComparar && (
              <button type="button" onClick={() => onComparar(p.id)}
                aria-label={comparado ? 'Remover da comparação' : 'Adicionar à comparação'} aria-pressed={!!comparado}
                className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-colors ${
                  comparado
                    ? 'bg-[var(--mv-brand-soft)] border-[var(--mv-brand-line)] text-[var(--mv-brand)]'
                    : 'bg-[var(--mv-surface)] border-[var(--mv-line)] text-[var(--mv-text-3)] hover:text-[var(--mv-brand)] hover:border-[var(--mv-brand-line)]'
                }`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v18M15 3v18M4 8h16M4 16h16" />
                </svg>
              </button>
            )}

            {disponivel && (
              <button type="button" onClick={adicionarAoCarrinho}
                className={`mv-btn mv-btn-ghost !px-3 !py-2 !text-[11px] !uppercase !tracking-wide ${adicionado ? 'mv-btn-added' : ''}`}>
                {adicionado ? 'Adicionado' : 'Carrinho'}
              </button>
            )}

            <button type="button" onClick={comprar} className="mv-btn mv-btn-primary !px-4 !py-2">Comprar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
