'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClienteVitrine } from '@/lib/vitrine-session';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CartItem { peca: any; quantidade: number; }

/**
 * Carrinho.
 *
 * Toda a mecânica permanece intacta: chave `marquinho-cart`/`marquinho-cupom` no
 * sessionStorage, limite de quantidade pelo estoque da LOJA, mesma regra de desconto
 * (PERCENTUAL = % sobre o subtotal; senão valor fixo) e o desvio para o login
 * guardando a intenção de ir ao checkout.
 */
export default function CarrinhoPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cupom, setCupom] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState<any>(null);
  const [observacao, setObservacao] = useState('');
  const [cliente, setCliente] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const s = sessionStorage.getItem('marquinho-cart');
    if (s) setCart(JSON.parse(s));
    // Cupom aplicado na sessão (vai para o checkout)
    const cp = sessionStorage.getItem('marquinho-cupom');
    if (cp) { try { setCupomAplicado(JSON.parse(cp)); } catch { /* */ } }
    const c = getClienteVitrine();
    if (c) setCliente(c);
  }, []);

  function atualizarQtd(i: number, q: number) {
    const n = [...cart];
    const limite = Number(n[i]?.peca?.quantidadeLoja ?? 0);
    if (q <= 0) n.splice(i, 1);
    else if (limite > 0 && q > limite) {
      setMsg('Quantidade máxima em estoque (loja) atingida.');
      setTimeout(() => setMsg(''), 2500);
      return;
    } else n[i] = { ...n[i], quantidade: q };
    setCart(n);
    sessionStorage.setItem('marquinho-cart', JSON.stringify(n));
  }

  // Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda.
  const precoItem = (peca: any) => {
    const pv = peca?.precoVitrine != null ? Number(peca.precoVitrine) : NaN;
    if (Number.isFinite(pv) && pv > 0) return pv;
    if (peca?.oferta && peca.precoOferta && Number(peca.precoOferta) < Number(peca.precoVenda)) return Number(peca.precoOferta);
    return Number(peca?.precoVenda) || 0;
  };
  const subtotal = cart.reduce((s, i) => s + precoItem(i.peca) * i.quantidade, 0);
  // Desconto do cupom (mesma regra do checkout): PERCENTUAL = % sobre o subtotal; senão valor fixo.
  const desconto = cupomAplicado
    ? cupomAplicado.tipo === 'PERCENTUAL' ? subtotal * (Number(cupomAplicado.valor) / 100) : Number(cupomAplicado.valor)
    : 0;
  const total = Math.max(0, subtotal - desconto);

  async function aplicarCupom() {
    const codigo = cupom.trim();
    if (!codigo) return;
    try {
      const r = await fetch(`/api/vitrine/cupons?codigo=${encodeURIComponent(codigo)}`);
      const data = await r.json();
      const lista = Array.isArray(data) ? data : data?.cupons || [];
      if (r.ok && lista.length > 0) {
        setCupomAplicado(lista[0]);
        sessionStorage.setItem('marquinho-cupom', JSON.stringify(lista[0]));
        setMsg('Cupom aplicado com sucesso!');
      } else {
        setCupomAplicado(null);
        sessionStorage.removeItem('marquinho-cupom');
        setMsg('Cupom inválido ou expirado.');
      }
      setTimeout(() => setMsg(''), 2500);
    } catch {
      setMsg('Erro ao aplicar o cupom.');
      setTimeout(() => setMsg(''), 2500);
    }
  }

  function irCheckout() {
    // Item 9: se não logado, manda para o login guardando a intenção — após entrar
    // o cliente volta direto ao checkout (em vez de cair sempre no carrinho).
    if (!cliente) { router.push('/vitrine/login?redirect=/vitrine/checkout'); return; }
    router.push('/vitrine/checkout');
  }

  const msgOk = msg.includes('sucesso');

  return (
    <div className="mv-container mv-section">
      {/* MIGALHAS + CABEÇALHO */}
      <nav className="mv-crumbs mb-3" aria-label="Você está aqui">
        <a href="/vitrine">Início</a>
        <span>/</span>
        <span className="text-[var(--mv-text-2)]">Carrinho</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--mv-text)]">Meu carrinho</h1>
        <p className="text-sm text-[var(--mv-text-2)] mt-1.5">
          {cart.length} {cart.length === 1 ? 'item' : 'itens'} · retirada na loja
        </p>
      </div>

      {msg && (
        <div className={`rounded-[var(--mv-r-md)] px-4 py-3 text-xs font-semibold mb-5 border ${
          msgOk
            ? 'bg-[var(--mv-ok-soft)] text-[var(--mv-ok)] border-transparent'
            : 'bg-[var(--mv-alert-soft)] text-[var(--mv-alert)] border-transparent'
        }`} role="status">
          {msg}
        </div>
      )}

      {cart.length === 0 ? (
        <div className="mv-empty !py-20">
          <svg className="w-14 h-14 mx-auto text-[var(--mv-line-strong)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />
          </svg>
          <p className="text-base font-bold text-[var(--mv-text)]">Seu carrinho está vazio</p>
          <p className="text-xs text-[var(--mv-text-3)] mt-1 mb-6">Explore o catálogo e monte seu pedido para retirar na loja.</p>
          <button type="button" onClick={() => router.push('/vitrine/catalogo')} className="mv-btn mv-btn-primary mv-btn-lg">
            Explorar produtos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start">

          {/* ITENS */}
          <div className="flex flex-col gap-3">
            {cart.map((item, i) => {
              const preco = precoItem(item.peca);
              const temOverride = item.peca?.precoVitrine != null && Number(item.peca.precoVitrine) > 0;
              const mostraRiscado = temOverride || (item.peca.oferta && item.peca.precoOferta);
              const limite = Number(item.peca?.quantidadeLoja ?? 0);
              return (
                <div key={i} className="mv-card !p-3 md:!p-4 flex gap-3.5 md:gap-4">
                  <a href={`/vitrine/produto/${item.peca.id}`}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-[var(--mv-r-md)] bg-[var(--mv-surface-2)] border border-[var(--mv-line)] flex-none overflow-hidden">
                    {item.peca.imagemUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.peca.imagemUrl} alt={item.peca.nome} className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[10px] text-[var(--mv-text-3)]">Sem foto</span>
                    )}
                  </a>

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                    <div>
                      <a href={`/vitrine/produto/${item.peca.id}`}
                        className="block text-sm font-bold text-[var(--mv-text)] leading-snug line-clamp-2 hover:text-[var(--mv-brand)] transition-colors">
                        {item.peca.nome}
                      </a>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {item.peca.marca && (
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mv-brand)]">{item.peca.marca}</span>
                        )}
                        {limite > 0 && (
                          <span className="text-[10px] text-[var(--mv-text-3)]">até {limite} em estoque</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3 flex-wrap">
                      <div className="mv-qty">
                        <button type="button" className="mv-qty-btn" aria-label={`Diminuir quantidade de ${item.peca.nome}`}
                          onClick={() => atualizarQtd(i, item.quantidade - 1)}>−</button>
                        <span className="mv-qty-val" aria-live="polite">{item.quantidade}</span>
                        <button type="button" className="mv-qty-btn" aria-label={`Aumentar quantidade de ${item.peca.nome}`}
                          disabled={limite > 0 && item.quantidade >= limite}
                          onClick={() => atualizarQtd(i, item.quantidade + 1)}>+</button>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-[var(--mv-text)]">{fm(preco * item.quantidade)}</span>
                        {mostraRiscado && (
                          <p className="mv-price-old !text-[11px]">{fm(Number(item.peca.precoVenda) * item.quantidade)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button type="button" onClick={() => atualizarQtd(i, 0)}
                    aria-label={`Remover ${item.peca.nome} do carrinho`}
                    className="self-start w-7 h-7 rounded-lg flex items-center justify-center text-[var(--mv-text-3)] hover:text-[var(--mv-alert)] hover:bg-[var(--mv-alert-soft)] transition-colors flex-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}

            <button type="button" onClick={() => router.push('/vitrine/catalogo')}
              className="self-start mt-1 text-xs font-bold text-[var(--mv-brand)] hover:underline">
              + Adicionar mais peças
            </button>
          </div>

          {/* RESUMO */}
          <aside className="lg:sticky lg:top-[calc(var(--mv-header-total)+16px)] lg:z-30">
            <div className="mv-panel">
              <h2 className="text-base font-extrabold text-[var(--mv-text)] mb-4">Resumo do pedido</h2>

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--mv-text-2)]">Subtotal</span>
                  <span className="font-semibold text-[var(--mv-text)]">{fm(subtotal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--mv-text-2)]">Desconto</span>
                  <span className="font-semibold text-[var(--mv-ok)]">− {fm(desconto)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--mv-text-2)]">Retirada na loja</span>
                  <span className="font-semibold text-[var(--mv-ok)]">Grátis</span>
                </div>
                <div className="flex justify-between items-baseline gap-3 pt-3.5 mt-1 border-t border-[var(--mv-line)]">
                  <span className="text-sm font-bold text-[var(--mv-text)]">Total</span>
                  <span className="text-xl font-extrabold text-[var(--mv-text)] tracking-tight">{fm(total)}</span>
                </div>
              </div>

              {/* CUPOM */}
              <div className="mt-5 pt-5 border-t border-[var(--mv-line)]">
                <label className="mv-label" htmlFor="mv-cupom">Cupom de desconto</label>
                <div className="flex gap-2">
                  <input id="mv-cupom" value={cupom} onChange={e => setCupom(e.target.value.toUpperCase())}
                    placeholder="CUPOM10" className="mv-input flex-1 !text-xs !py-2.5" />
                  <button type="button" onClick={aplicarCupom} className="mv-btn mv-btn-ghost !px-3.5">Aplicar</button>
                </div>
                {cupomAplicado && (
                  <p className="text-[11px] font-semibold text-[var(--mv-ok)] mt-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M5 13l4 4L19 7" /></svg>
                    {cupomAplicado.codigo} aplicado
                    {cupomAplicado.tipo === 'PERCENTUAL' ? ` (${cupomAplicado.valor}% off)` : ` (−${fm(Number(cupomAplicado.valor))})`}
                  </p>
                )}
              </div>

              {/* OBSERVAÇÃO */}
              <div className="mt-5">
                <label className="mv-label" htmlFor="mv-obs">Observações</label>
                <textarea id="mv-obs" value={observacao} onChange={e => setObservacao(e.target.value)}
                  className="mv-input !text-xs" rows={2} placeholder="Alguma observação para a loja?" />
              </div>

              {!cliente && (
                <div className="mt-4 rounded-[var(--mv-r-md)] bg-[var(--mv-warn-soft)] text-[#7a4408] px-3.5 py-3 text-xs font-semibold">
                  Faça login para continuar o pedido.
                </div>
              )}

              <button type="button" onClick={irCheckout} disabled={loading}
                className="mv-btn mv-btn-ok mv-btn-block mv-btn-lg mt-5">
                {loading ? 'Processando…' : 'Ir para o checkout'}
              </button>

              <button type="button" onClick={() => router.push('/vitrine')}
                className="mv-btn mv-btn-ghost mv-btn-block mt-2.5">
                Continuar comprando
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
