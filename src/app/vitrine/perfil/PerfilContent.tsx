'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getClienteVitrine, clearClienteVitrine } from '@/lib/vitrine-session';
import { DADOS_OFICINA } from '@/lib/empresa';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const LABEL_STATUS: Record<string, string> = {
  PEDIDO_RECEBIDO: 'Recebido',
  EM_SEPARACAO: 'Separando',
  PRONTO_PARA_RETIRADA: 'Pronto p/ Retirada',
  RETIRADO: 'Retirado',
  CANCELADO: 'Cancelado',
};

const STATUS_BADGE: Record<string, string> = {
  PEDIDO_RECEBIDO: 'mv-badge-brand',
  EM_SEPARACAO: 'mv-badge-gold',
  PRONTO_PARA_RETIRADA: 'mv-badge-ok',
  RETIRADO: 'mv-badge-soft',
  CANCELADO: 'mv-badge-alert',
};

const STATUS_STEPS = ['PEDIDO_RECEBIDO', 'EM_SEPARACAO', 'PRONTO_PARA_RETIRADA', 'RETIRADO'];

/**
 * Perfil do cliente. Mantém as duas consultas originais (pedidos e orçamentos),
 * a expansão do pedido, o código de retirada, o histórico e a saída da conta.
 * O pedido recém-finalizado continua sendo aberto automaticamente via ?pedido=N.
 */
export default function PerfilContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pedidoDestaque = searchParams.get('pedido');

  const [cliente, setCliente] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [tab, setTab] = useState<'pedidos' | 'orcamentos' | 'favoritos' | 'dados'>('pedidos');
  const [loading, setLoading] = useState(true);
  const [pedidoExpandido, setPedidoExpandido] = useState<string | null>(null);

  useEffect(() => {
    const d = getClienteVitrine();
    if (!d) { router.push('/vitrine/login?redirect=/vitrine/perfil'); return; }
    setCliente(d);

    // Buscar pedidos da vitrine
    fetch('/api/vitrine/pedidos', { headers: { Authorization: `Bearer ${d.token}` } })
      .then(r => r.json())
      .then(data => {
        setPedidos(data.pedidos || []);
        setLoading(false);
        // Expandir pedido destacado
        if (pedidoDestaque) {
          const destaque = (data.pedidos || []).find((p: any) => String(p.numero) === pedidoDestaque);
          if (destaque) setPedidoExpandido(destaque.id);
        }
      })
      .catch(() => setLoading(false));

    // Buscar orçamentos do cliente (estavam órfãos na página /vitrine/conta)
    fetch('/api/vitrine/orcamentos', { headers: { Authorization: `Bearer ${d.token}` } })
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setOrcamentos(data); })
      .catch(() => {});
  }, [router, pedidoDestaque]);

  if (!cliente) return null;

  function sair() { clearClienteVitrine(); router.push('/vitrine'); }

  const TABS = [
    { key: 'pedidos' as const, label: 'Meus pedidos' },
    { key: 'orcamentos' as const, label: 'Orçamentos' },
    { key: 'favoritos' as const, label: 'Favoritos' },
    { key: 'dados' as const, label: 'Meus dados' },
  ];

  function getStatusStep(status: string) {
    if (status === 'CANCELADO') return -1;
    return STATUS_STEPS.indexOf(status);
  }

  const primeiroNome = String(cliente.nome || '').split(' ')[0];

  return (
    <div className="mv-container mv-section">
      <nav className="mv-crumbs mb-3" aria-label="Você está aqui">
        <a href="/vitrine">Início</a>
        <span>/</span>
        <span className="text-[var(--mv-text-2)]">Minha conta</span>
      </nav>

      {/* CABEÇALHO DA CONTA */}
      <div className="mv-panel !p-5 md:!p-6 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <span className="w-12 h-12 rounded-full bg-[var(--mv-brand)] text-white font-extrabold flex items-center justify-center flex-none text-lg">
            {primeiroNome.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-[var(--mv-text)] truncate">
              Olá, {primeiroNome}
            </h1>
            <p className="text-xs text-[var(--mv-text-3)] truncate">{cliente.email || cliente.telefone}</p>
          </div>
        </div>
        <button type="button" onClick={sair} className="mv-btn mv-btn-ghost !text-xs">Sair da conta</button>
      </div>

      {/* ABAS */}
      <div className="flex gap-1.5 overflow-x-auto mb-6 border-b border-[var(--mv-line)] pb-px" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={`relative px-3.5 py-2.5 text-xs font-bold whitespace-nowrap transition-colors flex-none ${
              tab === t.key ? 'text-[var(--mv-brand)]' : 'text-[var(--mv-text-3)] hover:text-[var(--mv-text)]'
            }`}>
            {t.label}
            <span className={`absolute left-2 right-2 -bottom-px h-0.5 rounded-full ${tab === t.key ? 'bg-[var(--mv-brand)]' : 'bg-transparent'}`} />
          </button>
        ))}
      </div>

      {/* PEDIDOS */}
      {tab === 'pedidos' && (
        loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="mv-skel h-32 rounded-[var(--mv-r-lg)]" />)}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="mv-empty !py-20">
            <svg className="w-14 h-14 mx-auto text-[var(--mv-line-strong)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-base font-bold text-[var(--mv-text)]">Nenhum pedido ainda</p>
            <p className="text-xs text-[var(--mv-text-3)] mt-1 mb-6">Monte seu primeiro pedido e retire na loja.</p>
            <a href="/vitrine/catalogo" className="mv-btn mv-btn-primary mv-btn-lg">Ver catálogo</a>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pedidos.map(p => {
              const aberto = pedidoExpandido === p.id;
              const semItens = !p.itens?.length;
              return (
                <div key={p.id} className={`mv-card !p-0 overflow-hidden ${aberto ? 'border-[var(--mv-brand-line)]' : ''}`}>
                  {/* Cabeçalho do pedido */}
                  <button type="button" onClick={() => setPedidoExpandido(aberto ? null : p.id)}
                    aria-expanded={aberto}
                    className="w-full text-left p-4">
                    <div className="flex items-center justify-between gap-3 mb-2.5 flex-wrap">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm font-extrabold text-[var(--mv-brand)]">#{p.numero}</span>
                        <span className={`mv-badge ${STATUS_BADGE[p.status] || 'mv-badge-soft'}`}>
                          {LABEL_STATUS[p.status] || p.status}
                        </span>
                        {p.formaPagamento && (
                          <span className="text-[10px] text-[var(--mv-text-3)] uppercase font-bold tracking-wider">
                            {String(p.formaPagamento).replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-[var(--mv-text-3)]">{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                        <svg className={`w-4 h-4 text-[var(--mv-text-3)] transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Etapas do pedido (se não cancelado) */}
                    {p.status !== 'CANCELADO' && (
                      <div className="mv-steps mt-1 mb-1">
                        {['Recebido', 'Separando', 'Pronto', 'Retirado'].map((step, i) => {
                          const done = getStatusStep(p.status) >= i;
                          return (
                            <div key={step} className="flex items-center flex-1 last:flex-none">
                              <span className={`mv-step-dot ${done ? 'mv-done' : ''}`} />
                              <span className={`text-[9px] ml-1.5 whitespace-nowrap ${done ? 'text-[var(--mv-ok)] font-bold' : 'text-[var(--mv-text-3)]'}`}>{step}</span>
                              {i < 3 && <span className={`mv-step-bar ${done ? 'mv-done' : ''}`} />}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-end justify-between mt-2 gap-3">
                      <p className="text-xs text-[var(--mv-text-2)]">
                        {semItens ? 'Sem itens registrados' : `${p.itens!.length} ${p.itens!.length === 1 ? 'item' : 'itens'}`}
                      </p>
                      <p className="text-base font-extrabold text-[var(--mv-text)] tracking-tight">{fm(Number(p.total))}</p>
                    </div>
                  </button>

                  {/* Detalhe expandido */}
                  {aberto && (
                    <div className="px-4 pb-4 pt-4 border-t border-[var(--mv-line)] flex flex-col gap-4">

                      {/* Itens */}
                      {!semItens && (
                        <div>
                          <p className="mv-label">Produtos</p>
                          <div className="flex flex-col">
                            {(p.itens || []).map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-[var(--mv-line)] last:border-b-0">
                                <div className="min-w-0">
                                  <p className="font-semibold text-[var(--mv-text)] truncate">{item.peca.nome}</p>
                                  <p className="text-[var(--mv-text-3)] mt-0.5">{item.quantidade}x {fm(Number(item.precoVendido))}</p>
                                </div>
                                <span className="font-extrabold text-[var(--mv-text)] whitespace-nowrap">{fm(Number(item.subtotal))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Código de retirada — só quando pronto */}
                      {p.status === 'PRONTO_PARA_RETIRADA' && p.qrCode && (
                        <div className="rounded-[var(--mv-r-lg)] bg-[var(--mv-brand-soft)] border border-[var(--mv-brand-line)] p-4 text-center">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--mv-brand)] mb-2.5">Código de retirada</p>
                          <span className="inline-block bg-white px-6 py-3 rounded-[var(--mv-r-md)] border border-[var(--mv-brand-line)] text-sm font-extrabold text-[var(--mv-brand)] tracking-[0.15em]">
                            {p.qrCode}
                          </span>
                          <p className="text-[10px] text-[var(--mv-text-2)] mt-2.5">Apresente este código no balcão para retirar seu pedido.</p>
                        </div>
                      )}

                      {/* Retirada */}
                      <div className="rounded-[var(--mv-r-md)] bg-[var(--mv-surface-2)] border border-[var(--mv-line)] p-3.5">
                        <p className="mv-label">Retirada na loja</p>
                        <p className="text-xs text-[var(--mv-text-2)]">{DADOS_OFICINA.endereco} — {DADOS_OFICINA.cidade}</p>
                        <p className="text-xs text-[var(--mv-text-3)] mt-0.5">{DADOS_OFICINA.horario}</p>
                        {p.retiradaNome && (
                          <p className="text-xs text-[var(--mv-text-2)] mt-1.5 font-semibold">Retirada por: {p.retiradaNome}</p>
                        )}
                      </div>

                      {/* Linha do tempo */}
                      {p.historico && p.historico.length > 0 && (
                        <div>
                          <p className="mv-label">Linha do tempo</p>
                          <div className="flex flex-col gap-2.5">
                            {p.historico.map((h: any) => (
                              <div key={h.id} className="flex items-start gap-2.5 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--mv-brand)] mt-1.5 flex-none" />
                                <div>
                                  <p className="text-[var(--mv-text-2)]">{h.descricao}</p>
                                  <p className="text-[10px] text-[var(--mv-text-3)] mt-0.5">{new Date(h.createdAt).toLocaleString('pt-BR')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Resumo financeiro */}
                      <div className="pt-3 border-t border-[var(--mv-line)] flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between gap-3"><span className="text-[var(--mv-text-2)]">Subtotal</span><span className="text-[var(--mv-text)]">{fm(Number(p.subtotal))}</span></div>
                        {Number(p.descontoTotal) > 0 && (
                          <div className="flex justify-between gap-3"><span className="text-[var(--mv-ok)]">Desconto</span><span className="text-[var(--mv-ok)]">− {fm(Number(p.descontoTotal))}</span></div>
                        )}
                        <div className="flex justify-between gap-3 font-bold text-[var(--mv-text)] pt-2 mt-1 border-t border-[var(--mv-line)]">
                          <span>Total</span><span className="text-sm">{fm(Number(p.total))}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ORÇAMENTOS */}
      {tab === 'orcamentos' && (
        orcamentos.length === 0 ? (
          <div className="mv-empty !py-20">
            <p className="text-base font-bold text-[var(--mv-text)]">Nenhum orçamento ainda</p>
            <p className="text-xs text-[var(--mv-text-3)] mt-1 mb-6">Os orçamentos que você pedir na loja aparecem aqui.</p>
            <a href="/vitrine/catalogo" className="mv-btn mv-btn-primary">Ver catálogo</a>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orcamentos.map(o => (
              <div key={o.id} className="mv-panel">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-extrabold text-[var(--mv-brand)]">#{o.numero}</span>
                    <span className={`mv-badge ${
                      o.status === 'APROVADO' ? 'mv-badge-ok'
                        : o.status === 'RECUSADO' ? 'mv-badge-alert'
                          : o.status === 'CONCLUIDO' ? 'mv-badge-soft'
                            : 'mv-badge-gold'
                    }`}>
                      {o.status === 'PENDENTE' ? 'Pendente' : o.status === 'APROVADO' ? 'Aprovado' : o.status === 'RECUSADO' ? 'Recusado' : 'Concluído'}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--mv-text-3)]">{new Date(o.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>

                {o.modeloMoto && <p className="text-xs text-[var(--mv-text-2)] mb-2">Moto: {o.modeloMoto}</p>}

                <div className="flex flex-col mb-3">
                  {(o.itens || []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-[var(--mv-line)] last:border-b-0">
                      <span className="text-[var(--mv-text)] truncate">{item.peca.nome}</span>
                      <span className="text-[var(--mv-text-3)] whitespace-nowrap">{item.quantidade}x {fm(Number(item.precoUnitario))}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[var(--mv-line)]">
                  <span className="text-xs text-[var(--mv-text-2)]">Total</span>
                  <strong className="text-base font-extrabold text-[var(--mv-text)] tracking-tight">{fm(Number(o.total))}</strong>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* FAVORITOS */}
      {tab === 'favoritos' && (
        <div className="mv-panel text-center !py-14">
          <svg className="w-12 h-12 mx-auto text-[var(--mv-line-strong)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-sm font-bold text-[var(--mv-text)]">Seus favoritos ficam em uma página própria</p>
          <p className="text-xs text-[var(--mv-text-3)] mt-1 mb-5">Lá você remove o que não quer mais com um toque.</p>
          <a href="/vitrine/favoritos" className="mv-btn mv-btn-primary">Ver favoritos</a>
        </div>
      )}

      {/* DADOS */}
      {tab === 'dados' && (
        <div className="mv-panel max-w-md">
          <h2 className="text-base font-extrabold text-[var(--mv-text)] mb-4">Meus dados</h2>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mv-label">Nome</p>
              <p className="text-sm font-semibold text-[var(--mv-text)]">{cliente.nome}</p>
            </div>
            <div>
              <p className="mv-label">Telefone</p>
              <p className="text-sm font-semibold text-[var(--mv-text)]">{cliente.telefone}</p>
            </div>
            {cliente.email && (
              <div>
                <p className="mv-label">E-mail</p>
                <p className="text-sm font-semibold text-[var(--mv-text)] break-all">{cliente.email}</p>
              </div>
            )}
            {cliente.modeloMoto && (
              <div>
                <p className="mv-label">Moto</p>
                <p className="text-sm font-semibold text-[var(--mv-text)]">{cliente.modeloMoto}</p>
              </div>
            )}
          </div>
          <p className="text-[11px] text-[var(--mv-text-3)] mt-5 pt-4 border-t border-[var(--mv-line)]">
            Precisa alterar algum dado? Fale com a loja pelo WhatsApp.
          </p>
        </div>
      )}
    </div>
  );
}
