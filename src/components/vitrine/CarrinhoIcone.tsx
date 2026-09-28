'use client';

import { useState, useEffect } from 'react';

interface CartItem { peca: any; quantidade: number; }

/** Evento interno da vitrine para avisar o header que o carrinho mudou. */
export const CARRINHO_EVENTO = 'marquinho-cart-updated';

export function lerCarrinho(): CartItem[] {
  try {
    const s = sessionStorage.getItem('marquinho-cart');
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

/**
 * Contagem reativa de itens do carrinho, para o selo do cabeçalho.
 * Ouve o evento disparado por `adicionar()` — assim o número sobe na hora,
 * sem precisar recarregar a página.
 */
export function useCarrinhoContagem(): number {
  const [qtd, setQtd] = useState(0);

  useEffect(() => {
    const atualizar = () => setQtd(lerCarrinho().reduce((s, i) => s + i.quantidade, 0));
    atualizar();
    window.addEventListener(CARRINHO_EVENTO, atualizar);
    return () => window.removeEventListener(CARRINHO_EVENTO, atualizar);
  }, []);

  return qtd;
}

/**
 * Ícone de carrinho do cabeçalho, com selo de quantidade.
 * Selo só aparece quando há itens — nunca mostra "0".
 */
export function CarrinhoIcone({ className = '' }: { className?: string }) {
  const qtd = useCarrinhoContagem();

  return (
    <a href="/vitrine/carrinho" className={`mv-action ${className}`} aria-label="Carrinho">
      <span className="relative">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
        </svg>
        {qtd > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#e8991a] text-[#3a2606] text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#0b1220]">
            {qtd > 9 ? '9+' : qtd}
          </span>
        )}
      </span>
      <span className="mv-action-label">Carrinho</span>
    </a>
  );
}

// Hook global para adicionar ao carrinho
export function useCarrinhoVitrine() {
  function adicionar(peca: any) {
    let cart: CartItem[] = [];
    try {
      cart = lerCarrinho();
    } catch {
      cart = [];
    }
    const idx = cart.findIndex((i: CartItem) => i.peca.id === peca.id);
    // Respeita o estoque da LOJA (quantidadeLoja) — nunca deixar o carrinho
    // ultrapassar o que existe na loja (o servidor também valida no fechamento).
    const limite = Number(peca?.quantidadeLoja ?? 0);
    const jaNoCarrinho = idx >= 0 ? cart[idx].quantidade : 0;
    if (limite > 0 && jaNoCarrinho >= limite) return;
    if (idx >= 0) cart[idx].quantidade += 1;
    else cart.push({
      peca: {
        id: peca.id, nome: peca.nome, codigo: peca.codigo,
        precoVenda: peca.precoVenda, precoOferta: peca.precoOferta, oferta: peca.oferta,
        precoVitrine: peca.precoVitrine != null ? peca.precoVitrine : undefined,
        imagemUrl: peca.imagemUrl, marca: peca.marca, quantidadeLoja: peca.quantidadeLoja,
      },
      quantidade: 1,
    });
    sessionStorage.setItem('marquinho-cart', JSON.stringify(cart));
    // Avisa o cabeçalho para atualizar o selo na hora.
    window.dispatchEvent(new Event(CARRINHO_EVENTO));
  }
  return { adicionar };
}
