'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getClienteVitrine } from '@/lib/vitrine-session';
import { DADOS_OFICINA } from '@/lib/empresa';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface CartItem { peca: any; quantidade: number; }

/**
 * Checkout.
 *
 * NENHUMA regra comercial mudou: retirada na loja como única modalidade, as mesmas
 * formas de pagamento, quem retira, cupom e observações. O payload enviado para
 * /api/vitrine/pedidos é idêntico ao anterior — inclusive o fallback de nome/telefone
 * quando "Eu mesmo" está marcado. O servidor continua sendo quem recalcula o preço.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cliente, setCliente] = useState<any>(null);
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [observacoes, setObservacoes] = useState('');
  const [cupom, setCupom] = useState('');
  const [cupomAplicado, setCupomAplicado] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Retirada
  const [retiradaNome, setRetiradaNome] = useState('');
  const [retiradaTelefone, setRetiradaTelefone] = useState('');
  const [retiradaDocumento, setRetiradaDocumento] = useState('');
  const [usarMeusDados, setUsarMeusDados] = useState(true);

  useEffect(() => {
    const s = sessionStorage.getItem('marquinho-cart');
    if (s) setCart(JSON.parse(s));
    // Cupom aplicado no carrinho (sessão) — persiste para o checkout
    const cp = sessionStorage.getItem('marquinho-cupom');
    if (cp) { try { setCupomAplicado(JSON.parse(cp)); } catch { /* */ } }
    const cd = getClienteVitrine();
    if (!cd) { router.push('/vitrine/login?redirect=/vitrine/checkout'); return; }
    setCliente(cd);
    setRetiradaNome(cd.nome || '');
    setRetiradaTelefone(cd.telefone || '');
  }, [router]);

  // Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda.
  // O servidor recalcula o preço no fechamento (item 12) — isto é apenas o resumo exibido.
  const precoItem = (peca: any) => {
    const pv = peca?.precoVitrine != null ? Number(peca.precoVitrine) : NaN;
    if (Number.isFinite(pv) && pv > 0) return pv;
    if (peca?.oferta && peca.precoOferta && Number(peca.precoOferta) < Number(peca.precoVenda)) return Number(peca.precoOferta);
    return Number(peca?.precoVenda) || 0;
  };
  const subtotal = cart.reduce((s, i) => s + precoItem(i.peca) * i.quantidade, 0);
  const descontoCupom = cupomAplicado
    ? cupomAplicado.tipo === 'PERCENTUAL' ? subtotal * (Number(cupomAplicado.valor) / 100) : Number(cupomAplicado.valor)
    : 0;
  const total = Math.max(0, subtotal - descontoCupom);

  async function aplicarCupom() {
    if (!cupom) return;
    try {
      const r = await fetch(`/api/vitrine/cupons?codigo=${encodeURIComponent(cupom)}`);
      // A rota /api/vitrine/cupons retorna um ARRAY (lista) — não { cupons: [] }.
      if (r.ok) {
        const data = await r.json();
        const lista = Array.isArray(data) ? data : data?.cupons || [];
        if (lista.length > 0) {
          setCupomAplicado(lista[0]);
          setMsg('');
        } else {
          setMsg('Cupom inválido ou expirado.');
          setCupomAplicado(null);
        }
      } else {
        setMsg('Erro ao consultar o cupom.');
        setCupomAplicado(null);
      }
    } catch {
      setMsg('Erro de conexão ao consultar o cupom.');
      setCupomAplicado(null);
    }
  }

  async function finalizar() {
    if (!retiradaNome.trim() || !retiradaTelefone.trim()) {
      setMsg('Preencha os dados de quem irá retirar.');
      return;
    }
    setLoading(true);
    setMsg('');
    try {
      const r = await fetch('/api/vitrine/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cliente.token}` },
        body: JSON.stringify({
          itens: cart.map(i => ({ pecaId: i.peca.id, quantidade: i.quantidade })),
          formaPagamento,
          observacoes,
          cupomCodigo: cupomAplicado?.codigo || null,
          retiradaNome: usarMeusDados ? cliente.nome : retiradaNome,
          retiradaTelefone: usarMeusDados ? cliente.telefone : retiradaTelefone,
          retiradaDocumento: usarMeusDados ? null : (retiradaDocumento || null),
        }),
      });
      if (r.ok) {
        const pedido = await r.json();
        sessionStorage.removeItem('marquinho-cart');
        sessionStorage.removeItem('marquinho-cupom');
        setCupomAplicado(null);
        setMsg(`Pedido #${pedido.numero} realizado com sucesso!`);
        setTimeout(() => router.push(`/vitrine/perfil?pedido=${pedido.numero}`), 1500);
      } else {
        const e = await r.json();
        setMsg(e.error || 'Erro ao finalizar pedido.');
      }
    } catch { setMsg('Erro de conexão.'); }
    setLoading(false);
  }

  if (!cliente) return null;

  const msgOk = msg.includes('sucesso') || msg.includes('realizado');

  const formas = [
    { key: 'PIX', label: 'PIX', desc: 'Pagamento instantâneo', icone: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { key: 'CARTAO_CREDITO', label: 'Crédito', desc: 'Na retirada', icone: 'M3 10h18M7 15h1m4 0h2m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { key: 'CARTAO_DEBITO', label: 'Débito', desc: 'Na retirada', icone: 'M3 10h18M7 15h1m4 0h2m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { key: 'DINHEIRO', label: 'Dinheiro', desc: 'Na retirada', icone: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  ];

  return (
    <div className="mv-container mv-section">
      <nav className="mv-crumbs mb-3" aria-label="Você está aqui">
        <a href="/vitrine/carrinho">Carrinho</a>
        <span>/</span>
        <span className="text-[var(--mv-text-2)]">Checkout</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--mv-text)]">Finalizar pedido</h1>
        <p className="text-sm text-[var(--mv-text-2)] mt-1.5">Confira os dados e escolha como pagar na retirada.</p>
      </div>

      {msg && (
        <div className={`rounded-[var(--mv-r-md)] px-4 py-3 text-xs font-semibold mb-5 ${
          msgOk ? 'bg-[var(--mv-ok-soft)] text-[var(--mv-ok)]' : 'bg-[var(--mv-alert-soft)] text-[var(--mv-alert)]'
        }`} role="status">{msg}</div>
      )}

      {/* Duas colunas no desktop: formulário à esquerda, resumo fixo à direita. */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start">
        <div className="flex flex-col gap-4 order-2 lg:order-1">

          {/* RETIRADA NA LOJA — modalidade única */}
          <section className="mv-panel">
            <h2 className="text-base font-extrabold text-[var(--mv-text)] mb-3">Como você recebe</h2>
            <div className="flex items-start gap-3.5 p-4 rounded-[var(--mv-r-lg)] border-2 border-[var(--mv-brand)] bg-[var(--mv-brand-soft)]">
              <span className="w-10 h-10 rounded-full bg-[var(--mv-brand)] text-white flex items-center justify-center flex-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-[var(--mv-text)] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[var(--mv-brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M5 13l4 4L19 7" /></svg>
                  Retirada na loja
                </p>
                <p className="text-xs text-[var(--mv-text-2)] mt-0.5">{DADOS_OFICINA.endereco} — {DADOS_OFICINA.cidade}</p>
                <p className="text-xs text-[var(--mv-text-3)] mt-0.5">{DADOS_OFICINA.horario}</p>
              </div>
            </div>
          </section>

          {/* QUEM IRÁ RETIRAR */}
          <section className="mv-panel">
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <h2 className="text-base font-extrabold text-[var(--mv-text)]">Quem irá retirar?</h2>
              <button type="button" onClick={() => setUsarMeusDados(v => !v)}
                className={`mv-toggle ${usarMeusDados ? 'mv-on' : ''}`} aria-pressed={usarMeusDados}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Eu mesmo
              </button>
            </div>

            {usarMeusDados ? (
              <div className="rounded-[var(--mv-r-md)] bg-[var(--mv-surface-2)] border border-[var(--mv-line)] p-3.5 text-xs">
                <p className="font-bold text-[var(--mv-text)]">{cliente.nome}</p>
                <p className="text-[var(--mv-text-3)] mt-0.5">{cliente.telefone}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="mv-label" htmlFor="mv-rnome">Nome de quem irá retirar</label>
                  <input id="mv-rnome" placeholder="Nome completo" value={retiradaNome}
                    onChange={e => setRetiradaNome(e.target.value)} className="mv-input w-full !text-xs" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="mv-label" htmlFor="mv-rtel">Telefone / WhatsApp</label>
                    <input id="mv-rtel" placeholder="(81) 9…" value={retiradaTelefone}
                      onChange={e => setRetiradaTelefone(e.target.value)} className="mv-input w-full !text-xs" />
                  </div>
                  <div>
                    <label className="mv-label" htmlFor="mv-rdoc">Documento (opcional)</label>
                    <input id="mv-rdoc" placeholder="CPF / RG" value={retiradaDocumento}
                      onChange={e => setRetiradaDocumento(e.target.value)} className="mv-input w-full !text-xs" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* PAGAMENTO */}
          <section className="mv-panel">
            <h2 className="text-base font-extrabold text-[var(--mv-text)] mb-3">Forma de pagamento</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {formas.map(f => {
                const on = formaPagamento === f.key;
                return (
                  <button key={f.key} type="button" onClick={() => setFormaPagamento(f.key)} aria-pressed={on}
                    className={`rounded-[var(--mv-r-lg)] p-3.5 text-left border-2 transition-all ${
                      on
                        ? 'border-[var(--mv-brand)] bg-[var(--mv-brand-soft)]'
                        : 'border-[var(--mv-line)] bg-[var(--mv-surface)] hover:border-[var(--mv-brand-line)]'
                    }`}>
                    <svg className={`w-5 h-5 mb-2 ${on ? 'text-[var(--mv-brand)]' : 'text-[var(--mv-text-3)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={f.icone} />
                    </svg>
                    <span className={`block text-xs font-extrabold ${on ? 'text-[var(--mv-brand)]' : 'text-[var(--mv-text)]'}`}>{f.label}</span>
                    <span className="block text-[10px] text-[var(--mv-text-3)] mt-0.5">{f.desc}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* OBSERVAÇÕES */}
          <section className="mv-panel">
            <label className="mv-label" htmlFor="mv-obscheck">Observações</label>
            <textarea id="mv-obscheck" value={observacoes} onChange={e => setObservacoes(e.target.value)}
              className="mv-input w-full !text-xs resize-none" rows={2} placeholder="Alguma observação para o pedido?" />
          </section>

          <div className="flex items-start gap-2.5 px-4 py-3 rounded-[var(--mv-r-md)] bg-[var(--mv-brand-soft)] text-xs">
            <svg className="w-4 h-4 text-[var(--mv-brand)] flex-none mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[var(--mv-text-2)]">
              Separação em até <strong className="text-[var(--mv-text)]">2 horas</strong> após a confirmação do pedido.
            </span>
          </div>
        </div>

        {/* RESUMO FIXO */}
        <aside className="order-1 lg:order-2 lg:sticky lg:top-[calc(var(--mv-header-total)+16px)] lg:z-30">
          <div className="mv-panel">
            <h2 className="text-base font-extrabold text-[var(--mv-text)] mb-3">Resumo do pedido</h2>

            <div className="flex flex-col gap-0 mb-4">
              {cart.map((item, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2.5 border-b border-[var(--mv-line)] last:border-b-0 text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--mv-text)] truncate">{item.peca.nome}</p>
                    <p className="text-[var(--mv-text-3)] mt-0.5">Qtd: {item.quantidade}</p>
                  </div>
                  <span className="font-extrabold text-[var(--mv-text)] whitespace-nowrap">{fm(precoItem(item.peca) * item.quantidade)}</span>
                </div>
              ))}
            </div>

            {/* CUPOM */}
            <div className="mb-4 pt-1">
              <label className="mv-label" htmlFor="mv-cupom-ck">Cupom de desconto</label>
              <div className="flex gap-2">
                <input id="mv-cupom-ck" value={cupom} onChange={e => setCupom(e.target.value.toUpperCase())}
                  placeholder="CÓDIGO" className="mv-input flex-1 !text-xs !py-2.5 uppercase" />
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

            <div className="flex flex-col gap-2.5 text-xs pt-4 border-t border-[var(--mv-line)]">
              <div className="flex justify-between gap-3">
                <span className="text-[var(--mv-text-2)]">Subtotal</span>
                <span className="font-semibold text-[var(--mv-text)]">{fm(subtotal)}</span>
              </div>
              {descontoCupom > 0 && (
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--mv-text-2)]">Desconto</span>
                  <span className="font-semibold text-[var(--mv-ok)]">− {fm(descontoCupom)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span className="text-[var(--mv-text-2)]">Retirada na loja</span>
                <span className="font-semibold text-[var(--mv-ok)]">Grátis</span>
              </div>
              <div className="flex justify-between items-baseline gap-3 pt-3.5 mt-1 border-t border-[var(--mv-line)]">
                <span className="text-sm font-bold text-[var(--mv-text)]">Total</span>
                <span className="text-xl font-extrabold text-[var(--mv-text)] tracking-tight">{fm(total)}</span>
              </div>
            </div>

            <button type="button" onClick={finalizar} disabled={loading || cart.length === 0}
              className="mv-btn mv-btn-ok mv-btn-block mv-btn-lg mt-5">
              {loading ? 'Finalizando…' : `Finalizar pedido — ${fm(total)}`}
            </button>

            <p className="text-[11px] text-[var(--mv-text-3)] text-center mt-3 leading-relaxed">
              Ao finalizar, você concorda com nossos termos. Retirada somente na loja.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
