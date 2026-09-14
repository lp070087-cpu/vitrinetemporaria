'use client';

import { useState, useEffect } from 'react';
import { imprimirNotaServico, imprimirNotaVenda, normalizarVendaParaImpressao, fmtDataHora } from '@/lib/imprimirNotaServico';

interface Nota {
  id: string;
  numero: string;
  chaveAcesso?: string | null;
  dataServico?: string | null;
  emitidaEm: string;
  ordemServicoId?: string | null;
  vendaId?: string | null;
  ordemServico?: {
    numero: number; nomeCliente: string; telefoneCliente: string; valorTotal: number;
    modeloMoto: string; placaMoto?: string | null; anoMoto?: string | null;
    valorMaoDeObra: number; desconto?: number; formaPagamento?: string | null;
    tipoServico?: string | null; status?: string; inicioServico?: string | null; fimServico?: string | null;
    mecanico?: { name: string } | null;
    itens?: { peca: { codigo?: string | null; nome: string; marca?: string | null }; quantidade: number; precoUnitario: number }[];
    servicos?: { nome: string; valor: number | string }[] | null;
    pagamentos?: { tipo: string; valor: number; troco?: number }[];
  } | null;
  venda?: {
    numero: number; clienteNome?: string | null; clienteTelefone?: string | null; clienteCpf?: string | null;
    subtotal: number; descontoTotal: number; total: number; createdAt: string;
    itens: { peca: { nome: string; codigo?: string | null; marca?: string | null }; quantidade: number; precoVendido: number; subtotal: number }[];
    pagamentos: { tipo: string; valor: number; troco: number; bandeira?: string | null; parcelas?: number | null }[];
  } | null;
}

export default function NotasPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtroOrigem, setFiltroOrigem] = useState('TODAS');
  const [selecionada, setSelecionada] = useState<Nota | null>(null);

  async function fetchNotas() {
    setLoading(true);
    try {
      const res = await fetch('/api/notas').catch(() => null);
      if (!res) { setErro('Erro ao carregar notas.'); setLoading(false); return; }
      const data = await res.json();
      if (Array.isArray(data)) {
        setNotas(data);
        setErro('');
      } else {
        setNotas([]);
        setErro(data?.error || 'Erro ao carregar notas.');
      }
    } catch {
      setNotas([]);
      setErro('Erro ao carregar notas.');
    }
    setLoading(false);
  }
  useEffect(() => { fetchNotas(); }, []);

  const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function origem(n: Nota): 'ORDEM_DE_SERVICO' | 'VENDA_PDV' {
    return n.vendaId || n.venda ? 'VENDA_PDV' : 'ORDEM_DE_SERVICO';
  }
  function origemLabel(n: Nota): string {
    return origem(n) === 'VENDA_PDV' ? 'VENDA / PDV' : 'ORDEM DE SERVIÇO';
  }
  function clienteDe(n: Nota): string {
    if (origem(n) === 'VENDA_PDV') return n.venda?.clienteNome || 'Cliente avulso';
    return n.ordemServico?.nomeCliente || '—';
  }
  function valorDe(n: Nota): number {
    if (origem(n) === 'VENDA_PDV') return Number(n.venda?.total) || 0;
    return Number(n.ordemServico?.valorTotal) || 0;
  }
  function refDe(n: Nota): string {
    if (origem(n) === 'VENDA_PDV') return `Venda #${n.venda?.numero ?? ''}`;
    return `OS #${n.ordemServico?.numero ?? ''}`;
  }
  // AJUSTE 2 — data + hora no formato único: dd/MM/yyyy - HH:mm.
  // Fonte: Nota.dataServico (horário ORIGINAL da operação) → Nota.emitidaEm.
  // A REIMPRESSÃO mostra o horário original, nunca o do clique.
  function dataExibicao(n: Nota): string {
    return fmtDataHora(n.dataServico || n.emitidaEm);
  }

  function imprimirNota(n: Nota) {
    if (origem(n) === 'VENDA_PDV' && n.venda) {
      // Fonte única de normalização + layout — idêntica à impressão original do PDV.
      imprimirNotaVenda(normalizarVendaParaImpressao(n.venda, n.numero));
      return;
    }
    imprimirNotaServico({
      id: n.ordemServicoId || n.id,
      numero: n.ordemServico?.numero,
      nomeCliente: n.ordemServico?.nomeCliente,
      telefoneCliente: n.ordemServico?.telefoneCliente,
      modeloMoto: n.ordemServico?.modeloMoto,
      placaMoto: n.ordemServico?.placaMoto || '',
      anoMoto: n.ordemServico?.anoMoto || '',
      tipoServico: n.ordemServico?.tipoServico || '',
      status: n.ordemServico?.status,
      valorTotal: n.ordemServico?.valorTotal,
      valorMaoDeObra: n.ordemServico?.valorMaoDeObra,
      desconto: n.ordemServico?.desconto,
      formaPagamento: n.ordemServico?.formaPagamento,
      mecanico: n.ordemServico?.mecanico || undefined,
      itens: (n.ordemServico?.itens || []).map(i => ({
        peca: { codigo: i.peca?.codigo || '', nome: i.peca?.nome || '', marca: i.peca?.marca ?? null },
        quantidade: i.quantidade,
        precoUnitario: Number(i.precoUnitario) || 0,
      })),
      servicos: (n.ordemServico?.servicos || []).map(s => ({ nome: s.nome, valor: s.valor })),
      inicioServico: n.ordemServico?.inicioServico || null,
      fimServico: n.ordemServico?.fimServico || null,
      pagamentos: (n.ordemServico?.pagamentos || []).map(p => ({
        tipo: p.tipo,
        valor: Number(p.valor) || 0,
        troco: Number(p.troco) || 0,
      })),
      notaFiscal: {
        numero: n.numero,
        chaveAcesso: n.chaveAcesso,
        dataServico: n.dataServico,
        emitidaEm: n.emitidaEm,
      },
    });
  }

  const filtradas = notas.filter(n => {
    if (filtroOrigem !== 'TODAS' && origem(n) !== filtroOrigem) return false;
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      (n.numero || '').toLowerCase().includes(q) ||
      clienteDe(n).toLowerCase().includes(q) ||
      refDe(n).toLowerCase().includes(q)
    );
  });

  const badgesOrigem: Record<string, string> = {
    ORDEM_DE_SERVICO: 'bg-sky-50 text-sky-700',
    VENDA_PDV: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">CENTRAL DE NOTAS</h1>
          <p className="text-sm text-slate-500 mt-0.5">Todas as notas emitidas — Ordens de Serviço e Vendas do PDV</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroOrigem}
            onChange={e => setFiltroOrigem(e.target.value)}
            className="input-field w-auto text-xs"
          >
            <option value="TODAS">Todas as origens</option>
            <option value="ORDEM_DE_SERVICO">Ordens de Serviço</option>
            <option value="VENDA_PDV">Vendas / PDV</option>
          </select>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por NF, OS, venda ou cliente..."
            className="input-field max-w-xs text-xs"
          />
        </div>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs mb-4">{erro}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : filtradas.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm text-slate-400">{notas.length === 0 ? 'Nenhuma nota emitida ainda.' : 'Nenhuma nota encontrada para os filtros.'}</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">NF</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Origem</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Ref.</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(n => {
                const orig = origem(n);
                return (
                  <tr
                    key={n.id}
                    onClick={() => setSelecionada(n)}
                    className="border-b border-slate-50 hover:bg-brand-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-mono text-brand-600 font-medium">{n.numero}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${badgesOrigem[orig]}`}>{origemLabel(n)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{refDe(n)}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{clienteDe(n)}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">{dataExibicao(n)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">{fm(valorDe(n))}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); setSelecionada(n); }}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50"
                        >
                          Visualizar
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); imprimirNota(n); }}
                          className="text-xs text-slate-600 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100"
                        >
                          Imprimir / Reimprimir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de visualização da nota */}
      {selecionada && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelecionada(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Nota #{selecionada.numero}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{origemLabel(selecionada)} · {refDe(selecionada)}</p>
              </div>
              <button onClick={() => setSelecionada(null)} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Cliente</p>
                  <p className="text-slate-800 font-medium">{clienteDe(selecionada)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Data</p>
                  <p className="text-slate-800 font-medium">{dataExibicao(selecionada)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Emitida em</p>
                  <p className="text-slate-800 font-medium">{fmtDataHora(selecionada.emitidaEm)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase">Valor</p>
                  <p className="text-slate-800 font-bold">{fm(valorDe(selecionada))}</p>
                </div>
                {selecionada.chaveAcesso && (
                  <div className="col-span-2">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Chave de acesso</p>
                    <p className="text-slate-800 font-mono text-xs break-all">{selecionada.chaveAcesso}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setSelecionada(null)} className="btn-secondary text-xs">Fechar</button>
              <button onClick={() => imprimirNota(selecionada)} className="btn-primary text-xs">Imprimir / Reimprimir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
