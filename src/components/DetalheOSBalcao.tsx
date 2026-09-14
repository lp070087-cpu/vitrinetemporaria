'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PagamentoModal from '@/components/pdv/PagamentoModal';
import { imprimirNotaServico, headerEmpresaCompacto, fmtDataHora } from '@/lib/imprimirNotaServico';
import { pecaMatchBusca } from '@/lib/peca-utils';

interface Peca {
  id: string; nome: string; codigo: string; codigoBarras?: string; precoVenda: number;
  quantidade: number; quantidadeLoja: number; compatibilidade?: string;
  categoria: { nome: string };
}
interface ItemOS {
  id: string; peca: Peca; quantidade: number; precoUnitario: number; adaptado?: boolean;
}
interface Mecanico { id: string; name: string; emAlmoco: boolean; }
interface ServicoBalcao { id?: string; nome?: string; valor?: number | string; }
export interface OS {
  id: string; numero: number; nomeCliente: string; telefoneCliente: string;
  modeloMoto: string; placaMoto?: string; anoMoto?: string;
  descricaoProblema: string; diagnostico?: string; status: string;
  valorTotal: number; valorMaoDeObra: number;
  desconto?: number;
  mecanico?: Mecanico; mecanicoId?: string; balcao?: { name: string };
  itens: ItemOS[];
  servicos?: ServicoBalcao[] | null;
  notaFiscal?: { id: string; numero: string; chaveAcesso?: string | null; dataServico?: string | null; emitidaEm: string };
  statusPagamento?: string | null; formaPagamento?: string | null;
  valorPago?: number | null; dataPagamento?: string | null;
  usuarioPagamento?: string | null;
  createdAt?: string;
  tipoServico?: string;
  inicioServico?: string | null; fimServico?: string | null;
  pagamentos?: { tipo: string; valor: number; troco?: number }[];
}

function getCompatBadge(peca: Peca, modeloMoto: string): { label: string; color: string } {
  const comp = (peca.compatibilidade || '').toLowerCase();
  const modelo = modeloMoto.toLowerCase();
  if (comp.includes('universal')) return { label: 'Universal', color: 'bg-violet-50 text-violet-700' };
  if (comp.includes(modelo)) return { label: 'Compativel', color: 'bg-emerald-50 text-emerald-700' };
  return { label: 'Adaptada', color: 'bg-amber-50 text-amber-700' };
}

export default function DetalheOSBalcao({ os: initialOS, onClose }: { os: OS; onClose: () => void }) {
  const [dados, setDados] = useState<OS>(initialOS);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState('');

  // Peça autocomplete
  const [pecaBusca, setPecaBusca] = useState('');
  const [pecaAberta, setPecaAberta] = useState(false);
  const [qtd, setQtd] = useState('1');
  const [mostrarTodas, setMostrarTodas] = useState(false);

  // Revisão (mão de obra)
  const [temRevisao, setTemRevisao] = useState(Number(dados.valorMaoDeObra) > 0);
  const [valorRevisao, setValorRevisao] = useState(String(Number(dados.valorMaoDeObra) || 0));

  const pecaInputRef = useRef<HTMLInputElement>(null);
  const pecaDropdownRef = useRef<HTMLDivElement>(null);
  const carregarReqRef = useRef(0); // Guarda contra race condition entre buscas

  // Pagamento
  const [pagamentoOpen, setPagamentoOpen] = useState(false);
  const [pagandoOS, setPagandoOS] = useState(false);

  // BLOCO 2 — nenhum recebimento de OS sem sessão de caixa ABERTA (proteção no frontend)
  async function abrirPagamentoComCaixa() {
    try {
      const res = await fetch('/api/caixa');
      const data = await res.json();
      if (data?.sessaoAberta) { setPagamentoOpen(true); return; }
      setMsg('Nenhum caixa aberto. Abra o caixa antes de realizar uma venda.');
    } catch {
      setMsg('Não foi possível verificar o caixa. Tente novamente.');
    }
  }

  const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const sc: Record<string, string> = {
    ABERTA: 'bg-sky-50 text-sky-700', EM_ANDAMENTO: 'bg-amber-50 text-amber-700',
    AGUARDANDO_PECAS: 'bg-orange-50 text-orange-700', PRONTA: 'bg-violet-50 text-violet-700',
    CONCLUIDA: 'bg-emerald-50 text-emerald-700', CANCELADA: 'bg-red-50 text-red-700',
  };
  const sl: Record<string, string> = {
    ABERTA: 'Aberta', EM_ANDAMENTO: 'Em andamento', AGUARDANDO_PECAS: 'Aguard. pecas',
    PRONTA: 'Pronta', CONCLUIDA: 'Concluida', CANCELADA: 'Cancelada',
  };

  // Carregar peças
  const carregarPecas = useCallback(async (todas: boolean) => {
    const p = new URLSearchParams();
    if (dados.modeloMoto && !todas) p.set('modelo', dados.modeloMoto);
    if (todas) p.set('todas', '1');
    const reqId = ++carregarReqRef.current; // Incrementa e captura o id desta chamada
    try {
      const r = await fetch(`/api/pecas?${p}`);
      // Respostas fora de ordem são ignoradas (race condition)
      if (reqId !== carregarReqRef.current) return;
      const d = await r.json();
      if (reqId !== carregarReqRef.current) return;
      setPecas(Array.isArray(d) ? d : []);
    } catch {
      if (reqId === carregarReqRef.current) setPecas([]);
    }
  }, [dados.modeloMoto]);

  useEffect(() => {
    fetch('/api/mecanicos').then(r => r.json()).then(d => { if (Array.isArray(d)) setMecanicos(d); }).catch(() => {});
    carregarPecas(false);
    // Recarrega o detalhe completo (notaFiscal, servicos, inicio/fim) para impressão da Nota de Serviço
    fetch(`/api/ordens/${dados.id}`)
      .then(r => (r.ok ? r.json() : null))
      .then(u => { if (u && u.id) setDados(prev => ({ ...prev, ...u })); })
      .catch(() => {});
  }, [carregarPecas]);

  // Click outside para fechar dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        pecaDropdownRef.current && !pecaDropdownRef.current.contains(e.target as Node) &&
        pecaInputRef.current && !pecaInputRef.current.contains(e.target as Node)
      ) {
        setPecaAberta(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggleMostrarTodas() { const n = !mostrarTodas; setMostrarTodas(n); carregarPecas(n); }

  const pecasOrdenadas = useMemo(() => [...pecas].sort((a, b) => {
    const ba = getCompatBadge(a, dados.modeloMoto);
    const bb = getCompatBadge(b, dados.modeloMoto);
    const o: Record<string, number> = { 'Compativel': 0, 'Universal': 1, 'Adaptada': 2 };
    return (o[ba.label] ?? 3) - (o[bb.label] ?? 3);
  }), [pecas, dados.modeloMoto]);

  // Filtrar conforme busca no autocomplete
  // Busca tokenizada (BLOCO 3): nome, SKU, codigo de barras, compatibilidade
  const pecasFiltradas = useMemo(() => {
    const termo = pecaBusca.trim();
    const base = termo
      ? pecasOrdenadas.filter(p => pecaMatchBusca(p, termo, ['nome', 'codigo', 'codigoBarras', 'compatibilidade']))
      : pecasOrdenadas;
    return base.slice(0, 15);
  }, [pecasOrdenadas, pecaBusca]);

  // Mapa id → peça para consulta de estoque sem .find() por linha
  const pecasPorId = useMemo(() => {
    const m = new Map<string, Peca>();
    pecas.forEach(p => m.set(p.id, p));
    return m;
  }, [pecas]);

  const qtdCompativeis = useMemo(
    () => pecas.filter(p => getCompatBadge(p, dados.modeloMoto).label !== 'Adaptada').length,
    [pecas, dados.modeloMoto]
  );

  // Guarda de envio: evita POST duplicado enquanto a API responde
  const [pecasAbrindo, setPecasAbrindo] = useState<string[]>([]);

  async function addItem(pecaId: string) {
    if (!pecaId) return;
    if (pecasAbrindo.includes(pecaId)) return; // evita POST duplicado
    setPecasAbrindo(prev => [...prev, pecaId]);
    setMsg('');
    try {
      const r = await fetch(`/api/ordens/${dados.id}/itens`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pecaId, quantidade: Number(qtd) || 1 }),
      }).catch(() => null);
      if (!r) { setMsg('Erro ao adicionar peca.'); return; }
      const u = await r.json();
      if (!r.ok) { setMsg(u?.error || 'Erro ao adicionar peca.'); return; }
      // API de itens NÃO retorna notaFiscal/statusPagamento — preserva o estado atual
      setDados(prev => ({ ...prev, ...u }));
      setPecaBusca('');
      setQtd('1');
      setPecaAberta(false);
    } finally {
      setPecasAbrindo(prev => prev.filter(id => id !== pecaId));
    }
  }

  async function removeItem(itemId: string) {
    setMsg('');
    try {
      const r = await fetch(`/api/ordens/${dados.id}/itens`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      }).catch(() => null);
      if (!r) { setMsg('Erro ao remover peca.'); return; }
      const u = await r.json();
      if (!r.ok) { setMsg(u?.error || 'Erro ao remover peca.'); return; }
      setDados(prev => ({ ...prev, ...u }));
    } catch {
      setMsg('Erro ao remover peca.');
    }
  }

  async function atualizarRevisao() {
    const v = parseFloat(valorRevisao) || 0;
    const r = await fetch(`/api/ordens/${dados.id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: dados.status, valorMaoDeObra: v }),
    }).catch(() => null);
    if (!r) { setMsg('Erro ao salvar revisao.'); return; }
    const u = await r.json();
    if (!r.ok) { setMsg(u?.error || 'Erro ao salvar revisao.'); return; }
    setDados(prev => ({ ...prev, ...u }));
  }

  async function finalizarServico() {
    if (!confirm('Finalizar servico? A moto ficara AGUARDANDO PAGAMENTO para liberacao.')) return;
    // Primeiro atualiza mao de obra se necessario
    const vRevisao = parseFloat(valorRevisao) || 0;
    const body: any = { status: 'CONCLUIDA', statusPagamento: 'AGUARDANDO_PAGAMENTO' };
    if (vRevisao > 0) body.valorMaoDeObra = vRevisao;
    const r = await fetch(`/api/ordens/${dados.id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);
    if (!r) { setMsg('Erro ao finalizar servico.'); return; }
    const u = await r.json();
    if (!r.ok) { setMsg(u?.error || 'Erro ao finalizar servico.'); return; }
    setDados(prev => ({ ...prev, ...u }));
    setMsgOk('Servico finalizado! AGUARDANDO PAGAMENTO PARA LIBERACAO DA MOTO.');
  }

  async function liberarMoto() {
    if (!confirm('Liberar moto? A OS sera encerrada.')) return;
    const r = await fetch(`/api/ordens/${dados.id}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusPagamento: 'ENTREGUE', status: 'CONCLUIDA' }),
    }).catch(() => null);
    if (!r) { setMsg('Erro ao liberar moto.'); return; }
    const u = await r.json();
    if (!r.ok) { setMsg(u?.error || 'Erro ao liberar moto.'); return; }
    setDados(prev => ({ ...prev, ...u }));
    setMsgOk('Moto entregue! OS encerrada.');
  }

  async function receberPagamento(pagamentos: any[], trocoTotal: number) {
    setPagamentoOpen(false);
    setPagandoOS(true);
    setMsg('');
    try {
      // 1. Criar Pedido unificado (tipo: ORDEM_SERVICO) com os itens da OS
      const itensPedido = dados.itens.map(i => ({
        pecaId: i.peca.id,
        quantidade: i.quantidade,
        precoOriginal: Number(i.precoUnitario),
        descontoPercent: 0,
        descontoReais: 0,
        precoUnitario: Number(i.precoUnitario),
      }));

      // Incluir mao de obra como item observacao
      if (maoDeObraAtual > 0) {
        itensPedido.push({
          pecaId: dados.itens[0]?.peca?.id || '', // fallback
          quantidade: 1,
          precoOriginal: maoDeObraAtual,
          descontoPercent: 0,
          descontoReais: 0,
          precoUnitario: maoDeObraAtual,
          observacao: 'Mao de obra / Servico',
        } as any);
      }

      const pedidoRes = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: itensPedido.filter(i => i.pecaId),
          clienteNome: dados.nomeCliente,
          clienteTelefone: dados.telefoneCliente,
          tipo: 'ORDEM_SERVICO',
          origem: 'ORDEM_SERVICO',
          ordemServicoId: dados.id,
          observacoes: `Pagamento OS #${dados.numero} — ${dados.modeloMoto}`,
        }),
      });
      const pedido = await pedidoRes.json();
      if (pedido.error) { setMsg(pedido.error); setPagandoOS(false); return; }

      // 2. Criar Venda via fluxo unificado
      const pgsProcessados = pagamentos.map((p: any) => ({
        ...p,
        troco: p.tipo === 'DINHEIRO' ? trocoTotal : 0,
      }));

      const vendaRes = await fetch('/api/vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId: pedido.id, pagamentos: pgsProcessados }),
      });
      const venda = await vendaRes.json();
      if (venda.error) { setMsg(typeof venda.error === 'string' ? venda.error : 'Erro ao processar pagamento'); setPagandoOS(false); return; }

      // 3. Atualizar OS: marcar como PAGA
      const r = await fetch(`/api/ordens/${dados.id}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusPagamento: 'PAGO',
          status: 'CONCLUIDA',
          formaPagamento: pagamentos.map((p: any) => p.tipo).join(', '),
          valorPago: totalGeral,
          dataPagamento: new Date().toISOString(),
        }),
      });

      if (r?.ok) {
        const u = await r.json();
        setDados(u);
        setMsgOk(`✅ PAGAMENTO RECEBIDO! Venda #${venda.numero} gerada. A moto esta liberada para entrega.`);
      } else {
        setMsgOk('✅ Pagamento recebido e venda gerada! (OS atualizada parcialmente)');
      }
    } catch {
      setMsg('Erro ao processar pagamento.');
    }
    setPagandoOS(false);
  }

  // ============================================================
  // NOTA DO CLIENTE (OS) — DOCUMENTO 2
  //  - Se a OS já tem nota → reimprime com os dados atuais.
  //  - Se NÃO tem → emite automaticamente (POST /api/notas, número
  //    gerado OS-XXXX) e imprime na sequência.
  //  - Data do Serviço preservada da OS (reimpressão nunca altera).
  // ============================================================
  const [emitindoNF, setEmitindoNF] = useState(false);

  async function emitirEImprimirNF() {
    if (emitindoNF) return;
    setEmitindoNF(true);
    setMsg('');
    try {
      let nf = dados.notaFiscal;
      if (!nf) {
        const res = await fetch('/api/notas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ordemServicoId: dados.id, dataServico: null }),
        }).catch(() => null);
        const data = await res?.json();
        if (!res || res.status !== 201 || !data?.id) {
          setMsg(data?.error || 'Erro ao emitir a nota. Tente novamente.');
          return;
        }
        nf = { id: data.id, numero: data.numero, chaveAcesso: data.chaveAcesso, dataServico: data.dataServico, emitidaEm: data.emitidaEm };
        setDados(prev => ({ ...prev, notaFiscal: nf }));
      }
      imprimirNotaServico({ ...(dados as any), notaFiscal: nf });
    } catch {
      setMsg('Erro ao emitir a nota.');
    } finally {
      setEmitindoNF(false);
    }
  }

  function imprimirNotaMecanico() {
    const w = window.open('', '_blank', 'width=320,height=700');
    if (!w) return;
    // AJUSTE 2 — data + hora no formato único do sistema: dd/MM/yyyy - HH:mm.
    // Fonte: NotaFiscal.dataServico (preservado) → emitidaEm → abertura da OS.
    const dataHoraStr = fmtDataHora(dados.notaFiscal?.dataServico || dados.notaFiscal?.emitidaEm || dados.createdAt);
    const itens = dados.itens || [];
    const servicosList = dados.tipoServico ? dados.tipoServico.split(', ') : [];
    function esc(s: string) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    const linhasPecas = itens.length > 0
      ? itens.map(i => `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:9px"><span><span style="display:inline-block;width:14px;height:14px;border:1.5px solid #000;vertical-align:middle;margin-right:4px"></span>${esc(i.peca?.nome || '-')} (${esc(i.peca?.codigo || '')})</span><span style="font-weight:700">${i.quantidade}x</span></div>`).join('')
      : '<div style="padding:2px 0;font-size:9px"><span style="display:inline-block;width:14px;height:14px;border:1.5px solid #000;vertical-align:middle;margin-right:4px"></span> ________________________</div>';
    const linhasServicos = servicosList.length > 0
      ? servicosList.map((s: string) => `<div style="padding:2px 0;font-size:9px"><span style="display:inline-block;width:14px;height:14px;border:1.5px solid #000;vertical-align:middle;margin-right:4px"></span> ${esc(s)}</div>`).join('')
      : '';
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nota Mecanico #' + dados.numero + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Courier New",monospace;font-size:10px;color:#000;width:280px;margin:0 auto;padding:8px 6px;background:#fff}.center{text-align:center}.logo{font-size:16px;font-weight:900;margin-bottom:2px}.ofic{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#222}.emp{font-size:8.5px;color:#222;font-weight:700;margin-top:1px;letter-spacing:0.3px;line-height:1.5}.doc-titulo-term{display:inline-block;margin-top:5px;font-size:9px;font-weight:900;letter-spacing:1.5px;color:#111;border:1.5px solid #000;border-radius:3px;padding:2px 8px;text-transform:uppercase}.title{font-size:14px;font-weight:900;margin:8px 0 3px;text-transform:uppercase;letter-spacing:1px}.osnum{font-size:18px;font-weight:900;margin:2px 0}.dt{font-size:8px;margin-bottom:8px}.sep{border:none;border-top:1.5px solid #000;margin:8px 0}.sep-dot{border:none;border-top:1px dotted #000;margin:6px 0}.s-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px;padding-bottom:2px;border-bottom:1px solid #000}.row{display:flex;justify-content:space-between;padding:2px 0;font-size:10px}.row-label{font-size:7px;text-transform:uppercase;letter-spacing:1px}.row-val{font-size:11px;font-weight:700}.grid2{display:flex;flex-wrap:wrap}.g-item{width:50%;padding:3px 0}.g-label{font-size:7px;text-transform:uppercase;letter-spacing:.5px}.g-val{font-size:11px;font-weight:700}.exec-line{border-bottom:1px dotted #000;height:24px;margin-bottom:6px}.sign{margin-top:16px;text-align:center}.sig-line{border-top:1px solid #000;margin:40px 30px 6px}.sig-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700}.footer{text-align:center;font-size:8px;margin-top:12px;padding-top:6px;border-top:1px solid #000}@media print{body{width:72mm;padding:4mm}@page{margin:0}}</style></head><body>' + headerEmpresaCompacto('Nota do Mecânico') + '<div class="title">OS #' + dados.numero + '</div><div class="dt">' + dataHoraStr + '</div><hr class="sep"><div class="row"><span class="row-label">Cliente</span><span class="row-val">' + esc(dados.nomeCliente) + '</span></div>' + (dados.telefoneCliente ? '<div class="row"><span class="row-label">Telefone</span><span class="row-val">' + esc(dados.telefoneCliente) + '</span></div>' : '') + '<div class="grid2"><div class="g-item"><div class="g-label">Modelo</div><div class="g-val">' + esc(dados.modeloMoto || '-') + '</div></div><div class="g-item"><div class="g-label">Placa</div><div class="g-val">' + esc(dados.placaMoto || '-') + '</div></div><div class="g-item"><div class="g-label">Ano</div><div class="g-val">' + esc(dados.anoMoto || '-') + '</div></div><div class="g-item"><div class="g-label">Mecanico</div><div class="g-val">' + esc(dados.mecanico?.name || '-') + '</div></div></div>' + (linhasServicos ? '<hr class="sep-dot"><div class="s-title">Servicos</div>' + linhasServicos : '') + (dados.descricaoProblema ? '<hr class="sep-dot"><div class="s-title">Problema / Observacoes</div><div style="font-size:9px;padding:4px 0;line-height:1.4">' + esc(dados.descricaoProblema) + '</div>' : '') + '<hr class="sep-dot"><div class="s-title">Pecas para Separacao</div>' + linhasPecas + '<hr class="sep-dot"><div class="s-title">Instrucoes de Execucao</div>' + [1,2,3,4].map(() => '<div class="exec-line"></div>').join('') + '<div class="sign"><div class="sig-line"></div><div class="sig-label">Assinatura do Mecanico</div></div><div class="footer">Marquinho Moto Peças — ' + dataHoraStr + '<br>Documento interno</div><script>setTimeout(function(){window.print();},300);</script></body></html>');
    w.document.close();
  }

  function linkWhatsApp() {
    const t = encodeURIComponent(
      `Ola ${dados.nomeCliente}! OS #${dados.numero} - ${dados.modeloMoto}. Total: ${fm(Number(dados.valorTotal))}`
    );
    window.open(`https://wa.me/55${dados.telefoneCliente.replace(/\D/g, '')}?text=${t}`, '_blank');
  }

  const totalPecas = (dados.itens || []).reduce((s, i) => s + Number(i.precoUnitario) * i.quantidade, 0);
  // Usar estado local para total reativo: mostra valor digitado antes de salvar via API
  const maoDeObraAtual = temRevisao ? (parseFloat(valorRevisao) || 0) : 0;
  const totalGeral = totalPecas + maoDeObraAtual;

  // Estados de visualizacao
  const isLiberado = dados.statusPagamento === 'ENTREGUE';
  const isPago = dados.statusPagamento === 'PAGO';
  const isAguardandoPagamento = dados.statusPagamento === 'AGUARDANDO_PAGAMENTO';

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">OS #{dados.numero}</h2>
            <p className="text-sm text-slate-500">
              {dados.nomeCliente} - {dados.modeloMoto}{dados.placaMoto ? ` (${dados.placaMoto})` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        {/* Tab */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          <button className="px-4 py-2 text-xs font-medium border-b-2 border-brand-600 text-brand-600">
            Pecas e Valores
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 min-h-0">
          {msg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs m-4 mb-0">{msg}</div>
          )}
          {msgOk && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded text-xs m-4 mb-0 font-bold">{msgOk}</div>
          )}

          {/* ===== SEÇÃO FIXA: BUSCA DE PEÇAS (não rola, não cobre nada) ===== */}
          <div className="flex-shrink-0 border-b border-slate-100 px-5 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Buscar peça por nome, código ou código de barras
              </span>
              <button
                onClick={toggleMostrarTodas}
                className={`text-[11px] font-medium px-2.5 py-1 rounded transition-colors ${
                  mostrarTodas ? 'bg-amber-100 text-amber-700' : 'bg-white border border-slate-200 text-slate-600'
                }`}
              >
                {mostrarTodas ? 'So compativeis' : 'Mostrar todas'}
              </button>
            </div>

            {/* Inputs */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={pecaInputRef}
                  value={pecaBusca}
                  onChange={e => { setPecaBusca(e.target.value); setPecaAberta(true); }}
                  onFocus={() => setPecaAberta(true)}
                  className="input-field text-sm"
                  placeholder="Buscar peca por nome ou codigo..."
                  autoComplete="off"
                />
              </div>
              <input
                type="number" value={qtd} onChange={e => setQtd(e.target.value)}
                className="input-field w-16 sm:w-24 text-sm" min="1"
                title="Quantidade"
              />
            </div>

            {/* Resultados INLINE — não cobrem as peças selecionadas nem o rodapé */}
            {pecaAberta && pecasFiltradas.length > 0 && (
              <div
                ref={pecaDropdownRef}
                className="mt-2 border border-slate-200 rounded-lg bg-white overflow-y-auto max-h-52"
              >
                {pecasFiltradas.map(p => {
                  const b = getCompatBadge(p, dados.modeloMoto);
                  const abrindo = pecasAbrindo.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addItem(p.id)}
                      disabled={abrindo}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-brand-50 hover:text-brand-700 flex items-center justify-between border-b border-slate-50 disabled:opacity-50 disabled:cursor-wait"
                    >
                      <div>
                        <span className="font-medium text-slate-700">{p.nome}</span>
                        <span className="text-slate-400 ml-2 font-mono text-[10px]">{p.codigo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${b.color}`}>{b.label}</span>
                        <span className="text-[10px] text-slate-400">
                          Cent:{p.quantidade || 0} Loja:{p.quantidadeLoja || 0}
                        </span>
                        <span className="font-semibold text-slate-600">{fm(Number(p.precoVenda))}</span>
                        <span className="text-[10px] font-bold text-brand-600">{abrindo ? '...' : '+'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ===== SEÇÃO ROLÁVEL: PEÇAS UTILIZADAS / SELEIONADAS ===== */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pecas utilizadas / selecionadas
                  <span className="ml-2 text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                    {dados.itens.length} {dados.itens.length === 1 ? 'item' : 'itens'}
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {qtdCompativeis} compativeis com <strong className="text-brand-600">{dados.modeloMoto}</strong>
                </span>
              </div>

              {dados.itens.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">Nenhuma peca adicionada. Use a busca acima para incluir.</p>
              ) : (
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-1.5 font-medium text-slate-500">Peca</th>
                      <th className="text-center py-1.5 font-medium text-slate-500">Tipo</th>
                      <th className="text-center py-1.5 font-medium text-slate-500">Loja</th>
                      <th className="text-center py-1.5 font-medium text-slate-500">Central</th>
                      <th className="text-right py-1.5 font-medium text-slate-500">Qtd</th>
                      <th className="text-right py-1.5 font-medium text-slate-500">Unit.</th>
                      <th className="text-right py-1.5 font-medium text-slate-500">Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.itens.map(i => {
                      const b = getCompatBadge(i.peca, dados.modeloMoto);
                      const isAd = i.adaptado || b.label === 'Adaptada';
                      const pecaOrig = pecasPorId.get(i.peca.id);
                      const qcentral = pecaOrig?.quantidade || 0;
                      const qloja = pecaOrig?.quantidadeLoja || 0;
                      return (
                        <tr key={i.id} className="border-b border-slate-50">
                          <td className="py-1.5 text-slate-700">
                            <span className="font-medium">{i.peca.nome}</span>
                            <span className="block text-[10px] font-mono text-slate-400">{i.peca.codigo}</span>
                          </td>
                          <td className="py-1.5 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                              isAd ? 'bg-amber-50 text-amber-700' : b.label === 'Compativel' ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'
                            }`}>
                              {isAd ? 'Adaptada' : b.label}
                            </span>
                          </td>
                          <td className={`py-1.5 text-center font-bold text-[10px] ${qloja > 0 ? 'text-brand-600' : 'text-red-400'}`}>{qloja}</td>
                          <td className={`py-1.5 text-center font-bold text-[10px] ${qcentral > 0 ? 'text-slate-500' : 'text-amber-600'}`}>{qcentral}</td>
                          <td className="py-1.5 text-right">{i.quantidade}</td>
                          <td className="py-1.5 text-right text-slate-500">{fm(Number(i.precoUnitario))}</td>
                          <td className="py-1.5 text-right font-medium">{fm(Number(i.precoUnitario) * i.quantidade)}</td>
                          <td className="py-1.5 text-right">
                            <button onClick={() => removeItem(i.id)} className="text-red-500 text-[11px]">x</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="py-1.5 text-right text-xs text-slate-500">Total pecas</td>
                      <td className="py-1.5 text-right font-bold">{fm(totalPecas)}</td>
                      <td></td>
                    </tr>
                    {/* Mão de obra com checkbox Revisão */}
                    <tr>
                      <td colSpan={6} className="py-1.5 text-right text-xs text-slate-500">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={temRevisao}
                            onChange={async e => {
                              const checked = e.target.checked;
                              setTemRevisao(checked);
                              if (!checked) {
                                setValorRevisao('0');
                                const r = await fetch(`/api/ordens/${dados.id}/status`, {
                                  method: 'PUT', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: dados.status, valorMaoDeObra: 0 }),
                                });
                                if (r?.ok) { const u = await r.json(); setDados(prev => ({ ...prev, ...u })); }
                              }
                            }}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span>Revisao?</span>
                        </label>
                      </td>
                      <td className="py-1.5 text-right font-bold">
                        {temRevisao ? (
                          <input
                            type="number"
                            step="0.01"
                            value={valorRevisao}
                            onChange={e => setValorRevisao(e.target.value)}
                            onBlur={atualizarRevisao}
                            className="input-field w-20 sm:w-24 text-xs text-right"
                          />
                        ) : (
                          <span className="text-slate-400">{fm(0)}</span>
                        )}
                      </td>
                      <td></td>
                    </tr>
                    {/* Total Geral */}
                    <tr className="font-bold bg-brand-50">
                      <td colSpan={6} className="py-2 text-right text-sm text-slate-700">TOTAL</td>
                      <td className="py-2 text-right text-sm text-brand-700">{fm(totalGeral)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-100 space-y-3 flex-shrink-0">
          {isLiberado ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-block px-3 py-1 rounded text-xs font-bold bg-emerald-600 text-white">
                Moto Entregue ✓
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
                <button onClick={imprimirNotaMecanico} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors">
                  🖨️ Nota Mecânico
                </button>
                <button onClick={emitirEImprimirNF} disabled={emitindoNF} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-white border-2 border-brand-300 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {emitindoNF ? 'Emitindo...' : dados.notaFiscal ? '📄 Nota do Cliente' : '📄 Emitir Nota do Cliente'}
                </button>
              </div>
            </div>
          ) : isPago ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-block px-3 py-1 rounded text-xs font-bold bg-emerald-50 text-emerald-700">
                🟢 Pagamento confirmado
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
                <button onClick={imprimirNotaMecanico} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors">
                  🖨️ Nota Mecânico
                </button>
                <button onClick={emitirEImprimirNF} disabled={emitindoNF} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 bg-white border-2 border-brand-300 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                  {emitindoNF ? 'Emitindo...' : dados.notaFiscal ? '📄 Nota do Cliente' : '📄 Emitir Nota do Cliente'}
                </button>
                <button onClick={liberarMoto} className="btn-primary text-sm">
                  🏍️ Liberar Moto
                </button>
              </div>
            </div>
          ) : isAguardandoPagamento ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                  🔴 AGUARDANDO PAGAMENTO PARA LIBERACAO DA MOTO
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={onClose} className="btn-secondary text-sm">Fechar</button>
                  <button onClick={imprimirNotaMecanico} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors">
                    🖨️ Nota Mecânico
                  </button>
                  <button
                    onClick={abrirPagamentoComCaixa}
                    className="btn-primary text-sm font-bold"
                    disabled={pagandoOS}
                  >
                    {pagandoOS ? 'Processando...' : '💰 RECEBER PAGAMENTO'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">
                Total: {fm(totalGeral)} — Receba o pagamento para liberar a moto.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`inline-block px-3 py-1 rounded text-xs font-medium ${sc[dados.status] || 'bg-slate-50 text-slate-500'}`}>
                {sl[dados.status] || dados.status}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={imprimirNotaMecanico} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 px-4 py-2 rounded-lg transition-colors">
                  🖨️ Nota Mecânico
                </button>
                <button onClick={linkWhatsApp} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-white border-2 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 px-4 py-2 rounded-lg transition-colors">
                  💬 WhatsApp
                </button>
                <button onClick={finalizarServico} disabled={dados.status === 'CANCELADA'} className="btn-primary text-sm font-bold">
                  🔧 Finalizar Servico
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de pagamento */}
      <PagamentoModal
        open={pagamentoOpen}
        total={totalGeral}
        onClose={() => setPagamentoOpen(false)}
        onConfirmar={receberPagamento}
      />
    </div>
  );
}

