'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { imprimirNfManual } from '@/lib/imprimirNotaServico';
import { mascaraMoeda, parseMoeda, fmtMoeda } from '@/lib/moeda-utils';

interface ItemNF { id: string; pecaId?: string; nome: string; codigo: string; codigoBarras?: string; marca?: string | null; quantidade: number; valorUnitario: number; }

interface Sugestao { id: string; nome: string; codigo: string; codigoBarras?: string; marca?: string | null; precoVenda: number; quantidade: number; quantidadeLoja: number; estoqueMinimo: number; }

export default function NFManualPage() {
  const [cliente, setCliente] = useState('');
  const [cpf, setCpf] = useState('');
  const [endereco, setEndereco] = useState('');
  const [obs, setObs] = useState('');
  const [itens, setItens] = useState<ItemNF[]>([]);
  const [msg, setMsg] = useState('');
  // BLOCO 7 — Desconto (R$) fixo: máscara de maquininha, sem negativo,
  // nunca maior que o subtotal. Só vale para o documento impresso.
  const [descontoStr, setDescontoStr] = useState('');

  // AJUSTE 2 — FORMA B: produto manual (não cadastrado). Não cria Peca, não
  // altera estoque/SKU/código de barras/vitrine. Entra só neste documento.
  const [manualAberto, setManualAberto] = useState(false);
  const [manualNome, setManualNome] = useState('');
  const [manualQtd, setManualQtd] = useState('1');
  const [manualValor, setManualValor] = useState('');

  // AJUSTE 2 — VALOR TOTAL MANUAL: se preenchido, vira o TOTAL FINAL (ignora o
  // cálculo subtotal−desconto). Vazio → usa o total calculado.
  const [totalManualStr, setTotalManualStr] = useState('');

  // Busca real de produtos (BLOCO 1): consulta /api/pecas/pesquisa e mostra
  // sugestões com SKU, código de barras, estoque disponível e preço. Não cria
  // produtos novos — cada item da NF precisa ser um produto existente.
  const [busca, setBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [sugestoesOpen, setSugestoesOpen] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);
  const sugestoesRef = useRef<HTMLDivElement>(null);

  const carregarSugestoes = useCallback(async (q: string) => {
    const termo = q.trim();
    if (termo.length < 2) { setSugestoes([]); setBuscando(false); return; }
    setBuscando(true);
    try {
      const res = await fetch(`/api/pecas/pesquisa?q=${encodeURIComponent(termo)}`);
      const data = await res.json();
      const lista: Sugestao[] = Array.isArray(data?.pecas) ? data.pecas : [];
      setSugestoes(lista.slice(0, 12));
      setSugestoesOpen(true);
    } catch { setSugestoes([]); }
    setBuscando(false);
  }, []);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { carregarSugestoes(busca); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [busca, carregarSugestoes]);

  // Fechar sugestões ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (sugestoesRef.current && !sugestoesRef.current.contains(e.target as Node) && buscaRef.current && !buscaRef.current.contains(e.target as Node)) {
        setSugestoesOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selecionarSugestao(s: Sugestao) {
    setItens(prev => [...prev, { id: `${s.id}-${Date.now()}`, pecaId: s.id, nome: s.nome, codigo: s.codigo, codigoBarras: s.codigoBarras, marca: s.marca ?? null, quantidade: 1, valorUnitario: Number(s.precoVenda) || 0 }]);
    setBusca('');
    setSugestoes([]);
    setSugestoesOpen(false);
    setMsg('');
    if (buscaRef.current) buscaRef.current.focus();
  }

  function removeItem(id: string) { setItens(itens.filter(i => i.id !== id)); }
  function atualizarQtd(id: string, qtd: number) { setItens(itens.map(i => i.id === id ? { ...i, quantidade: Math.max(1, qtd) } : i)); }
  function atualizarValor(id: string, v: string) { setItens(itens.map(i => i.id === id ? { ...i, valorUnitario: parseMoeda(v) } : i)); }

  // FORMA B — adiciona um item manual que existe SÓ neste documento.
  function adicionarProdutoManual() {
    const nome = manualNome.trim();
    const qtd = Math.max(1, parseInt(manualQtd) || 1);
    const valor = parseMoeda(manualValor);
    if (!nome) { setMsg('Informe o nome/descrição do produto manual.'); return; }
    if (valor <= 0) { setMsg('Informe o valor unitário do produto manual.'); return; }
    setItens(prev => [...prev, {
      id: `manual-${Date.now()}`,
      pecaId: undefined,
      nome,
      codigo: '',
      marca: null,
      quantidade: qtd,
      valorUnitario: valor,
    }]);
    setManualNome(''); setManualQtd('1'); setManualValor(''); setManualAberto(false); setMsg('');
  }

  const total = itens.reduce((s, i) => s + (i.valorUnitario || 0) * i.quantidade, 0);
  // BLOCO 7 — desconto em R$: nunca negativo, nunca maior que o subtotal.
  const descontoValor = Math.min(Math.max(parseMoeda(descontoStr), 0), Math.max(total, 0));
  const totalCalculado = Math.max(total - descontoValor, 0);
  // AJUSTE 2 — VALOR TOTAL MANUAL: preenchido → total final = valor manual;
  // vazio → total calculado (subtotal − desconto).
  const temTotalManual = totalManualStr.trim() !== '';
  const totalManualValor = temTotalManual ? parseMoeda(totalManualStr) : null;
  const totalFinal = totalManualValor != null ? totalManualValor : totalCalculado;
  const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function gerarDocumento(autoPrint: boolean) {
    if (itens.length === 0) { setMsg('Adicione pelo menos um produto.'); return; }
    if (totalFinal <= 0) { setMsg('O total final precisa ser maior que zero.'); return; }
    // MESMO documento/layout para IMPRIMIR e GERAR PDF — muda apenas se o
    // window.print() dispara sozinho (imprimir) ou se o usuário usa o botão
    // no documento (salvar PDF). Cabeçalho oficial (DADOS_EMPRESA) via headerHtml.
    imprimirNfManual({
      numero: new Date().getTime().toString().slice(-6),
      cliente,
      cpfCnpj: cpf,
      endereco,
      observacoes: obs,
      itens: itens.map(i => ({
        nome: i.nome,
        codigo: i.codigo,
        marca: i.marca ?? null,
        quantidade: i.quantidade,
        valorUnitario: i.valorUnitario,
      })),
      total: totalFinal,
      // Impressão sempre lista SUBTOTAL / DESCONTO / TOTAL FINAL. O "valor
      // total manual" substitui apenas a linha TOTAL — subtotal e desconto
      // continuam impressos (desconto só quando > 0).
      desconto: descontoValor,
      subtotal: total,
      // AJUSTE 2: data + horário do documento (mesmo instante para Imprimir e PDF).
      dataEmissao: new Date(),
      autoPrint,
    });
  }

  const estoqueLabel = (s: Sugestao) => `Central ${s.quantidade} · Loja ${s.quantidadeLoja || 0}`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">NOTA FISCAL MANUAL</h1>
          <p className="text-sm text-slate-500 mt-0.5">Controle interno - sem integracao fiscal</p>
        </div>
      </div>

      <div className="card space-y-4 mb-6">
        <h3 className="text-sm font-bold text-slate-800">Dados do cliente</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-semibold text-slate-600 uppercase">Nome do cliente</label><input value={cliente} onChange={e=>setCliente(e.target.value)} className="input-field mt-1.5" placeholder="Nome completo"/></div>
          <div><label className="text-xs font-semibold text-slate-600 uppercase">CPF/CNPJ</label><input value={cpf} onChange={e=>setCpf(e.target.value)} className="input-field mt-1.5" placeholder="000.000.000-00"/></div>
          <div><label className="text-xs font-semibold text-slate-600 uppercase">Endereco</label><input value={endereco} onChange={e=>setEndereco(e.target.value)} className="input-field mt-1.5" placeholder="Rua, numero, bairro"/></div>
        </div>
      </div>

      <div className="card space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Produtos</h3>
          <span className="text-xs text-slate-400">{itens.length} item(ns)</span>
        </div>

        {msg && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{msg}</div>}

        {/* Busca real de produtos (BLOCO 1) */}
        <div className="relative">
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Buscar produto por nome, SKU ou codigo de barras</label>
          <div className="relative mt-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              ref={buscaRef}
              value={busca}
              onChange={e => { setBusca(e.target.value); if (e.target.value.trim().length >= 2) setSugestoesOpen(true); }}
              onFocus={() => { if (sugestoes.length > 0) setSugestoesOpen(true); }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (sugestoes.length > 0) { selecionarSugestao(sugestoes[0]); }
                } else if (e.key === 'Escape') setSugestoesOpen(false);
              }}
              className="input-field pl-10 text-xs"
              placeholder="Digite pelo menos 2 letras..."
            />
            {buscando && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"/>}
          </div>

          {sugestoesOpen && (
            <div ref={sugestoesRef} className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
              {sugestoes.length === 0 ? (
                <p className="px-4 py-3 text-xs text-slate-400">{buscando ? 'Buscando...' : 'Nenhum produto encontrado.'}</p>
              ) : (
                sugestoes.map(s => (
                  <button
                    key={s.id}
                    onClick={() => selecionarSugestao(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-brand-50/60 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{s.nome}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {s.codigo}{s.codigoBarras ? ` · ${s.codigoBarras}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-brand-600">{fm(Number(s.precoVenda) || 0)}</p>
                        <p className="text-[10px] text-slate-400">{estoqueLabel(s)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* AJUSTE 2 — FORMA B: produto manual (não cadastrado). Não cria Peca,
            não altera estoque/SKU/código de barras/vitrine. Só este documento. */}
        <div className="border-t border-slate-100 pt-3">
          {!manualAberto ? (
            <button onClick={() => { setManualAberto(true); setMsg(''); }} className="text-xs font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Adicionar produto manual
            </button>
          ) : (
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Nome / descrição</label>
                <input value={manualNome} onChange={e => setManualNome(e.target.value)} className="input-field mt-1 text-xs" placeholder="Ex.: Serviço de montagem"/>
              </div>
              <div className="col-span-3 sm:col-span-2">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Qtd</label>
                <input type="number" min="1" value={manualQtd} onChange={e => setManualQtd(e.target.value)} className="input-field mt-1 text-xs text-center"/>
              </div>
              <div className="col-span-4 sm:col-span-3">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Valor unitário</label>
                <input value={manualValor} onChange={e => setManualValor(mascaraMoeda(e.target.value, manualValor))} inputMode="numeric" placeholder="0,00" className="input-field mt-1 text-xs text-right"/>
              </div>
              <div className="col-span-5 sm:col-span-2 flex gap-1">
                <button onClick={adicionarProdutoManual} className="btn-primary text-xs px-2 flex-1">Add</button>
                <button onClick={() => { setManualAberto(false); setManualNome(''); setManualValor(''); setManualQtd('1'); }} className="btn-secondary text-xs px-2">X</button>
              </div>
            </div>
          )}
        </div>

        {itens.length > 0 && (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-slate-50"><th className="text-left py-2 px-3 font-medium text-slate-500">Produto</th><th className="text-left py-2 px-3 font-medium text-slate-500">Cod</th><th className="text-center py-2 px-3 font-medium text-slate-500">Qtd</th><th className="text-right py-2 px-3 font-medium text-slate-500">Unit</th><th className="text-right py-2 px-3 font-medium text-slate-500">Total</th><th className="text-right py-2 px-3"></th></tr></thead>
              <tbody>{itens.map(i=>(
                <tr key={i.id} className="border-t border-slate-50">
                  <td className="py-1.5 px-3 text-slate-700">{i.nome}</td><td className="py-1.5 px-3 text-slate-400 font-mono">{i.codigo||'-'}</td>
                  <td className="py-1.5 px-3 text-center"><input type="number" min="1" value={i.quantidade} onChange={e=>atualizarQtd(i.id, parseInt(e.target.value)||1)} className="w-16 text-center input-field !py-1 !px-1 text-xs"/></td>
                  <td className="py-1.5 px-3 text-right"><input value={fmtMoeda(i.valorUnitario)} onChange={e=>atualizarValor(i.id, e.target.value)} className="w-28 text-right input-field !py-1 !px-1 text-xs"/></td>
                  <td className="py-1.5 px-3 text-right font-bold">{fm(i.valorUnitario*i.quantidade)}</td>
                  <td className="py-1.5 px-3 text-right"><button onClick={()=>removeItem(i.id)} className="text-red-500 text-[10px]">x</button></td>
                </tr>
              ))}</tbody>
              <tfoot><tr className="bg-brand-50"><td colSpan={4} className="py-2.5 px-3 text-right text-sm font-bold text-slate-700">Total</td><td className="py-2.5 px-3 text-right text-sm font-extrabold text-brand-700">{fm(total)}</td><td></td></tr></tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="card space-y-4 mb-6">
        <h3 className="text-sm font-bold text-slate-800">Observacoes</h3>
        <textarea value={obs} onChange={e=>setObs(e.target.value)} className="input-field" rows={2} placeholder="Observacoes adicionais..."/>
      </div>

      {/* BLOCO 7 — Desconto fixo em R$ com recálculo imediato */}
      <div className="card space-y-4 mb-6">
        <h3 className="text-sm font-bold text-slate-800">Totais e Desconto</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Subtotal</label>
            <p className="text-lg font-extrabold text-slate-800 mt-1">{fm(total)}</p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Desconto (R$)</label>
            <input
              value={descontoStr}
              onChange={e => setDescontoStr(mascaraMoeda(e.target.value, descontoStr))}
              inputMode="numeric"
              placeholder="R$ 0,00"
              className="input-field mt-1 text-sm font-bold"
            />
            {descontoValor > total && (
              <p className="text-[10px] text-red-500 mt-0.5">Desconto não pode ser maior que o subtotal.</p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase">Total</label>
            <p className="text-lg font-extrabold text-brand-700 mt-1">{fm(totalFinal)}</p>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Valor total manual (opcional)</label>
          <input
            value={totalManualStr}
            onChange={e => setTotalManualStr(mascaraMoeda(e.target.value, totalManualStr))}
            inputMode="numeric"
            placeholder="Vazio = usa o cálculo"
            className="input-field mt-1 text-sm font-bold"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            {temTotalManual
              ? `Total final definido manualmente: ${fm(totalManualValor || 0)}. Desconto e cálculo são ignorados.`
              : 'Vazio → total final = subtotal − desconto.'}
          </p>
        </div>
        {!temTotalManual && descontoValor > 0 && (
          <p className="text-[11px] text-slate-400">
            Desconto de {fm(descontoValor)} aplicado — total final {fm(totalFinal)}.
          </p>
        )}
      </div>

      {/* BLOCO 1 — dois botões separados, MESMO documento/layout */}
      <div className="flex flex-wrap gap-2 justify-end">
        <button
          onClick={() => gerarDocumento(true)}
          disabled={itens.length===0}
          className="btn-primary text-xs inline-flex items-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
          IMPRIMIR
        </button>
        <button
          onClick={() => gerarDocumento(false)}
          disabled={itens.length===0}
          className="btn-secondary text-xs inline-flex items-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"/></svg>
          GERAR PDF
        </button>
      </div>
    </div>
  );
}
