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

export default function NotasBalcaoPage() {
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

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

  // Mesmo módulo compartilhado da Central de Notas (DONA) — DOCUMENTO B, sem terceira versão
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

  const badgesOrigem: Record<string, string> = {
    ORDEM_DE_SERVICO: 'bg-sky-50 text-sky-700',
    VENDA_PDV: 'bg-violet-50 text-violet-700',
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">NOTAS DO BALCÃO</h1>
          <p className="text-sm text-slate-500 mt-0.5">Consulta e reimpressão das Notas do Cliente (Ordens de Serviço e Vendas do PDV)</p>
        </div>
        <button onClick={fetchNotas} className="btn-secondary text-xs px-3 py-2">
          Atualizar
        </button>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-xs mb-4">{erro}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">Carregando...</p>
      ) : notas.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-sm text-slate-400">Nenhuma nota emitida ainda. As notas são emitidas automaticamente no pagamento de Ordens de Serviço e Vendas do PDV.</p>
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
              {notas.map(n => {
                const orig = origem(n);
                return (
                  <tr key={n.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-brand-600 font-medium">{n.numero}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${badgesOrigem[orig]}`}>
                        {orig === 'VENDA_PDV' ? 'VENDA / PDV' : 'ORDEM DE SERVIÇO'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{refDe(n)}</td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">{clienteDe(n)}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">{dataExibicao(n)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">{fm(valorDe(n))}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => imprimirNota(n)}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50"
                      >
                        Imprimir / Reimprimir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
