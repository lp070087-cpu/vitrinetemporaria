'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCarrinhoVitrine } from './CarrinhoIcone';

interface PecaCarrinho {
  id: string;
  nome: string;
  codigo?: string;
  precoVenda?: number;
  precoOferta?: number;
  precoVitrine?: number;
  oferta?: boolean;
  imagemUrl?: string;
  marca?: string;
  quantidadeLoja?: number;
}

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Botão de adicionar ao carrinho + confirmação.
 *
 * Mecânica preservada: preço público por precedência (precoVitrine > oferta >
 * precoVenda), bloqueio quando o carrinho já bateu o estoque da LOJA (a mensagem
 * literal é a mesma) e a confirmação com os dois destinos — carrinho ou voltar às compras.
 */
export default function AdicionarAoCarrinho({
  peca,
  disponivel,
  className = '',
}: {
  peca: PecaCarrinho;
  disponivel: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { adicionar } = useCarrinhoVitrine();
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');

  // Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda.
  function precoItem(p: PecaCarrinho): number {
    const pv = p.precoVitrine != null ? Number(p.precoVitrine) : NaN;
    if (Number.isFinite(pv) && pv > 0) return pv;
    if (p.oferta && p.precoOferta && Number(p.precoOferta) < Number(p.precoVenda)) return Number(p.precoOferta);
    return Number(p.precoVenda) || 0;
  }

  if (!disponivel) {
    return (
      <button disabled className={`mv-btn mv-btn-quiet mv-btn-lg !cursor-not-allowed !opacity-60 ${className}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17"/></svg>
        Indisponível
      </button>
    );
  }

  function handleAdicionar() {
    const limite = peca.quantidadeLoja ?? 0;
    const jaNoCarrinho = JSON.parse(sessionStorage.getItem('marquinho-cart') || '[]')
      .find((i: any) => i.peca.id === peca.id)?.quantidade || 0;
    if (limite > 0 && jaNoCarrinho >= limite) {
      setErro('Quantidade máxima em estoque (loja) atingida.');
      setTimeout(() => setErro(''), 2500);
      return;
    }
    adicionar(peca);
    setErro('');
    setAberto(true); // AJUSTE 6: confirmação elegante
  }

  return (
    <div>
      <button onClick={handleAdicionar} className={`mv-btn mv-btn-primary mv-btn-lg ${className}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17"/></svg>
        Adicionar ao Carrinho
      </button>
      {erro && (
        <p className="text-[11px] text-[var(--mv-alert)] mt-2 font-semibold" role="alert">{erro}</p>
      )}

      {/* Confirmação */}
      {aberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(11,18,32,0.55)] backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-label="Produto adicionado ao carrinho"
          onClick={() => setAberto(false)}>
          <div className="bg-[var(--mv-surface)] rounded-[var(--mv-r-xl)] shadow-[var(--mv-sh-xl)] max-w-sm w-full p-7 border border-[var(--mv-line)]"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-[var(--mv-ok-soft)] text-[var(--mv-ok)] flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7"/></svg>
            </div>
            <h3 className="text-center text-sm font-extrabold text-[var(--mv-text)] mb-1">Adicionado ao carrinho!</h3>
            <p className="text-center text-xs text-[var(--mv-text-2)] mb-4">{peca.nome}</p>
            <p className="text-center text-xl font-extrabold text-[var(--mv-text)] mb-6 tabular-nums">{fm(precoItem(peca))}</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setAberto(false); router.push('/vitrine/carrinho'); }}
                className="mv-btn mv-btn-ok mv-btn-block mv-btn-lg">
                Finalizar Compra
              </button>
              <button onClick={() => { setAberto(false); router.push('/vitrine'); }}
                className="mv-btn mv-btn-ghost mv-btn-block">
                Continuar Comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
