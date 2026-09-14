'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DetalheOSBalcao, { OS } from '@/components/DetalheOSBalcao';
import { headerEmpresaCompacto, fmtDataHora } from '@/lib/imprimirNotaServico';

interface Mecanico { id: string; name: string; emAlmoco: boolean; }
interface RevisaoAPI { id: string; nome: string; valor: number; ativa: boolean; ordem: number; }

const CATALOGO_MOTOS = [
  'CG 125 Fan','CG 125 Titan','CG 150 Titan','CG 160','Titan 160','Bros 160','NXR 160',
  'XRE 300','CB 300F','CB 500F','Twister 250','Lander 250','Fazer 250','XTZ 250',
  'MT-03','MT-07','FZ25','FZ15','Factor 150','YBR 125','YS 250',
  'NMax 160','PCX 150','Elite 125','CB 1000R','CB 650R','NC 750X','Shadow 750',
  'GSX 125','GSX-S 750','Hayabusa','V-Strom 650','Ninja 300','Ninja 400','Z400','Z650','Z900',
  'G310R','F850GS','R1200GS','Tiger 900','Street Twin','Bonneville T120',
  'Classic 350','Himalayan','Interceptor 650','Meteor 350','DK150','Chopper 150',
  'Royal Enfield 350','Dafra Apache','Dafra Horizon','Haojue','Shineray',
].sort();

const ICONES_SERVICO: Record<string, string> = {
  'Revisao': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  'Troca de oleo': 'M6 4h12l-2 8H8L6 4zm2 8v6a2 2 0 002 2h4a2 2 0 002-2v-6M5 6h14M4 10h16',
  'Freios': 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 2a4 4 0 100 8 4 4 0 000-8z',
  'Motor': 'M4 3h4v4H4V3zm8 14h4v4h-4v-4zM4 13h4v4H4v-4zm8-10h4v4h-4V3zm-2 4V3m0 18v-4M3 7h4m-4 4h4m10-2h4m-4 4h4M6 17v-2m12-8v2M6 7v2m12 10v-2M12 7v10',
  'Suspensao': 'M8 3h8M8 3v3m8-3v3M8 6h8M6 9h12v2l-10 10H8V9z',
  'Eletrica': 'M7 2h10l-2 8h4l-8 12 2-8H7L9 2z',
  'Transmissao': 'M5 6h14M5 6a2 2 0 00-2 2m2-2a2 2 0 012-2m-2 2v8m14-8a2 2 0 012 2m-2-2a2 2 0 00-2-2m2 2v8M5 18h14M5 18a2 2 0 01-2-2m2 2a2 2 0 002 2m-2-2v-4m14 4a2 2 0 002-2m-2 2a2 2 0 01-2 2m2-2v-4',
  'Pneus': 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 3a6 6 0 110 12 6 6 0 010-12zM12 9l3 3m0 0l-3 3m3-3H9',
  'Diagnostico': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'Outros': 'M12 6v6m0 0v6m0-6h6m-6 0H6',
};

const TIPOS_SERVICO = ['Revisao','Troca de oleo','Freios','Motor','Suspensao','Eletrica','Transmissao','Pneus','Diagnostico','Outros'];

const STATUS_BADGE: Record<string, { label: string; color: string; dot: string }> = {
  ABERTA: { label: 'Aberta', color: 'bg-sky-50 text-sky-700 border-sky-200', dot: 'bg-sky-500' },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  AGUARDANDO_PECAS: { label: 'Aguard. pecas', color: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  PRONTA: { label: 'Pronta', color: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  CONCLUIDA: { label: 'Concluida', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  AGUARDANDO_PAGAMENTO: { label: 'Aguard. Pagamento', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  PAGO: { label: 'Pago', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  ENTREGUE: { label: 'Entregue', color: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
};

type SortField = 'numero' | 'nomeCliente' | 'mecanico' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';
type FiltroPeriodo = 'todas' | 'hoje' | 'semana' | 'mes';

export default function OrdensPage() {
  // Dados
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);
  const [mecanicos, setMecanicosLista] = useState<Mecanico[]>([]);
  const [revisoes, setRevisoes] = useState<RevisaoAPI[]>([]);

  // Filtros
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState<FiltroPeriodo>('todas');
  const [sortField, setSortField] = useState<SortField>('numero');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Modal
  const [modal, setModal] = useState<{ open: boolean; tipo: 'nova' | 'ver'; os?: OS }>({ open: false, tipo: 'nova' });
  const [form, setForm] = useState({
    nomeCliente: '', telefoneCliente: '', cpf: '',
    marcaMoto: '', modeloMoto: '', anoMoto: '', placaMoto: '', km: '',
    descricaoProblema: '', observacoes: '', mecanicoId: '', revisaoId: '', valorMaoDeObra: '0',
  });
  const [servicos, setServicos] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);

  // Combobox
  const [motoBusca, setMotoBusca] = useState('');
  const [motoAberta, setMotoAberta] = useState(false);
  const [motoIndex, setMotoIndex] = useState(-1);
  const motoInputRef = useRef<HTMLInputElement>(null);

  // Fetch
  const fetchOrdens = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/ordens');
      const data = await r.json();
      setOrdens(Array.isArray(data) ? data : []);
    } catch { setOrdens([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrdens();
    fetch('/api/mecanicos').then(r => r.json()).then(d => setMecanicosLista(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/revisoes').then(r => r.json()).then(d => setRevisoes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [fetchOrdens]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }
  }, [toast]);

  // Filtragem e ordenação
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioSemana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    let result = [...ordens];

    // Periodo
    if (periodo === 'hoje') result = result.filter(o => (o.createdAt || '').startsWith(hoje));
    else if (periodo === 'semana') result = result.filter(o => (o.createdAt || '') >= inicioSemana);
    else if (periodo === 'mes') result = result.filter(o => (o.createdAt || '') >= inicioMes);

    // Busca
    if (busca) {
      const q = busca.toLowerCase();
      result = result.filter(o =>
        o.nomeCliente.toLowerCase().includes(q) ||
        String(o.numero).includes(q) ||
        (o.placaMoto || '').toLowerCase().includes(q) ||
        o.modeloMoto.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      const d = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'numero') return d * (a.numero - b.numero);
      if (sortField === 'nomeCliente') return d * a.nomeCliente.localeCompare(b.nomeCliente);
      if (sortField === 'mecanico') return d * (a.mecanico?.name || '').localeCompare(b.mecanico?.name || '');
      if (sortField === 'status') return d * (getStatusKey(a).localeCompare(getStatusKey(b)));
      if (sortField === 'createdAt') return d * ((a.createdAt || '').localeCompare(b.createdAt || ''));
      return 0;
    });

    return result;
  }, [ordens, busca, periodo, sortField, sortDir, hoje, inicioSemana, inicioMes]);

  // Combobox
  const motosFiltradas = motoBusca
    ? CATALOGO_MOTOS.filter(m => m.toLowerCase().includes(motoBusca.toLowerCase()))
    : CATALOGO_MOTOS;

  function motoKeyDown(e: React.KeyboardEvent) {
    if (!motoAberta || motosFiltradas.length === 0) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { setMotoAberta(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setMotoIndex(i => Math.min(i + 1, motosFiltradas.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setMotoIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (motoIndex >= 0 && motoIndex < motosFiltradas.length) selecionarMoto(motosFiltradas[motoIndex]); }
    else if (e.key === 'Escape') { setMotoAberta(false); setMotoIndex(-1); }
  }
  function selecionarMoto(m: string) { setForm({ ...form, modeloMoto: m }); setMotoBusca(''); setMotoAberta(false); setMotoIndex(-1); }
  function toggleServico(s: string) { setServicos(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); }

  function getStatusKey(os: OS) {
    if (os.statusPagamento === 'AGUARDANDO_PAGAMENTO') return 'AGUARDANDO_PAGAMENTO';
    if (os.statusPagamento === 'PAGO') return 'PAGO';
    if (os.statusPagamento === 'ENTREGUE') return 'ENTREGUE';
    return os.status || '';
  }

  async function criarOS() {
    const errs: Record<string, string> = {};
    if (!form.nomeCliente.trim()) errs.nomeCliente = 'Informe o nome do cliente';
    if (Object.keys(errs).length > 0) { setErros(errs); return; }

    const body: any = {
      nomeCliente: form.nomeCliente,
      telefoneCliente: form.telefoneCliente || null,
      modeloMoto: form.modeloMoto,
      placaMoto: form.placaMoto,
      anoMoto: form.anoMoto,
      descricaoProblema: [form.descricaoProblema, form.observacoes ? 'Obs: ' + form.observacoes : ''].filter(Boolean).join(' | ') || null,
      mecanicoId: form.mecanicoId,
    };
    const tipos: string[] = [];
    if (form.revisaoId) { const rev = revisoes.find(r => r.id === form.revisaoId); if (rev) tipos.push(rev.nome); body.valorMaoDeObra = parseFloat(form.valorMaoDeObra) || 0; }
    if (servicos.length > 0) tipos.push(...servicos);
    if (tipos.length > 0) body.tipoServico = tipos.join(', ');

    const res = await fetch('/api/ordens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    if (res?.ok) {
      setModal({ open: false, tipo: 'nova' });
      setForm({ nomeCliente: '', telefoneCliente: '', cpf: '', marcaMoto: '', modeloMoto: '', anoMoto: '', placaMoto: '', km: '', descricaoProblema: '', observacoes: '', mecanicoId: '', revisaoId: '', valorMaoDeObra: '0' });
      setServicos([]); setMotoBusca(''); setMsg(''); setErros({});
      fetchOrdens();
      setToast('Ordem de Servico criada com sucesso!');
    } else { const e = await res?.json(); setMsg(e?.error || 'Erro ao criar OS.'); }
  }

  function abrirNova() {
    setForm({ nomeCliente: '', telefoneCliente: '', cpf: '', marcaMoto: '', modeloMoto: '', anoMoto: '', placaMoto: '', km: '', descricaoProblema: '', observacoes: '', mecanicoId: '', revisaoId: '', valorMaoDeObra: '0' });
    setServicos([]); setMotoBusca(''); setMsg(''); setErros({});
    setMotoAberta(false); setMotoIndex(-1);
    setModal({ open: true, tipo: 'nova' });
  }
  function abrirVer(os: OS) { setModal({ open: true, tipo: 'ver', os }); }
  function handleCloseModal() { setModal({ open: false, tipo: 'ver' }); fetchOrdens(); }
  function toggleSort(f: SortField) { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir(f === 'numero' ? 'desc' : 'asc'); } }
  const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  function renderErro(key: string) {
    if (!erros[key]) return null;
    return <p className="text-[10px] text-red-500 mt-0.5 font-medium">{erros[key]}</p>;
  }
  function inputClass(key: string) {
    return 'input-field mt-1' + (erros[key] ? ' border-red-300 bg-red-50' : '');
  }

  function imprimirOS(os: OS) {
    const w = window.open('', '_blank', 'width=320,height=700');
    if (!w) return;
    // AJUSTE 2 — data + hora no formato único do sistema: dd/MM/yyyy - HH:mm.
    // Fonte: NotaFiscal.dataServico (preservado na reimpressão) → emitidaEm → createdAt.
    const dataHoraStr = fmtDataHora(os.notaFiscal?.dataServico || os.notaFiscal?.emitidaEm || os.createdAt);
    const itens = os.itens || [];
    const servicosList = os.tipoServico ? os.tipoServico.split(', ') : [];
    function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    const linhasPecas = itens.length > 0
      ? itens.map((i: any) => '<div class="ck"><span class="cb"></span> ' + esc(i.peca?.nome || '-') + ' <span style="font-size:7px">x' + i.quantidade + '</span></div>').join('')
      : '<div class="ck"><span class="cb"></span> ________________________</div>';
    const linhasServicos = servicosList.length > 0
      ? servicosList.map((s: string) => '<div class="ck"><span class="cb"></span> ' + esc(s) + '</div>').join('')
      : '';
    const linhasExecucao = [1, 2, 3].map(() => '<div style="border-bottom:1px dotted #000;height:18px;margin-bottom:4px"></div>').join('');
    w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>OS #' + os.numero + '</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"DejaVu Sans Mono","Courier New",monospace;font-size:10px;color:#111;width:280px;margin:0 auto;padding:8px 6px;background:#fff;line-height:1.45}.center{text-align:center}.logo{font-size:16px;font-weight:900;margin-bottom:2px;letter-spacing:-0.5px}.ofic{font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#222}.emp{font-size:8.5px;color:#222;font-weight:700;margin-top:1px;letter-spacing:0.3px;line-height:1.5}.doc-titulo-term{display:inline-block;margin-top:5px;font-size:9px;font-weight:900;letter-spacing:1.5px;color:#111;border:1.5px solid #000;border-radius:3px;padding:2px 8px;text-transform:uppercase}.os-num{font-size:19px;font-weight:900;margin:5px 0 3px;letter-spacing:-0.5px}.dt{font-size:8px;margin-bottom:6px;color:#444}.sep{border:none;border-top:1.5px solid #000;margin:7px 0}.sep-dot{border:none;border-top:1px dotted #000;margin:6px 0}.s-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:9px 0 4px;padding-bottom:2px;border-bottom:1.5px solid #000;color:#222}.big{font-size:13px;font-weight:900;margin:3px 0;color:#222}.big-label{font-size:8px;text-transform:uppercase;letter-spacing:1px;margin-top:5px;color:#555}.grid{display:flex;flex-wrap:wrap}.g-item{width:50%;padding:3px 0}.g-label{font-size:8px;text-transform:uppercase;letter-spacing:.5px;color:#555}.g-val{font-size:12px;font-weight:700;color:#222}.ck{display:flex;align-items:center;gap:6px;padding:3px 0;font-size:10px}.cb{width:14px;height:14px;border:1.5px solid #000;display:inline-block;flex-shrink:0}.desc{font-size:10px;padding:5px 0;line-height:1.5;color:#333}.tf{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:10px;font-weight:700}.tf span:last-child{border-bottom:1px solid #000;min-width:70px;text-align:center}.sign{margin-top:14px;text-align:center}.sign .sig-line{border-top:1px solid #000;margin:35px 20px 5px}.sign .sig-label{font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700}.footer{text-align:center;font-size:8px;margin-top:12px;padding-top:6px;border-top:1px solid #000;color:#555}@media print{body{width:72mm;padding:3mm}@page{margin:0}}</style></head><body>' + headerEmpresaCompacto('Ordem de Serviço') + '<hr class="sep"><div class="os-num">OS #' + os.numero + '</div><div class="dt">' + dataHoraStr + '</div><hr class="sep"><div class="big-label">Cliente</div><div class="big">' + esc(os.nomeCliente) + '</div><div class="grid"><div class="g-item"><div class="g-label">Placa</div><div class="g-val">' + (os.placaMoto || '-') + '</div></div><div class="g-item"><div class="g-label">Ano</div><div class="g-val">' + (os.anoMoto || '-') + '</div></div><div class="g-item"><div class="g-label">Moto</div><div class="g-val" style="font-size:10px">' + esc(os.modeloMoto) + '</div></div><div class="g-item"><div class="g-label">Mecanico</div><div class="g-val" style="font-size:10px">' + esc(os.mecanico?.name || '-') + '</div></div></div>' + (linhasServicos ? '<hr class="sep-dot"><div class="s-title">Tipos de Servico</div>' + linhasServicos : '') + (os.descricaoProblema ? '<hr class="sep-dot"><div class="s-title">Problema</div><div class="desc">' + esc(os.descricaoProblema) + '</div>' : '') + '<hr class="sep-dot"><div class="s-title">Pecas</div>' + linhasPecas + '<hr class="sep-dot"><div class="s-title">Execucao</div>' + linhasExecucao + '<hr class="sep-dot"><div class="tf"><span>Inicio:</span><span>____:____</span></div><div class="tf"><span>Termino:</span><span>____:____</span></div><div class="sign"><div class="sig-line"></div><div class="sig-label">Assinatura do Mecanico</div></div><div class="footer">Marquinho Moto Peças — ' + dataHoraStr + '</div><script>setTimeout(function(){window.print();},300);</script></body></html>');
    w.document.close();
  }

  const sortArrow = (f: SortField) => (
    <span className="ml-1 inline-flex flex-col leading-none opacity-50">
      <svg className={'w-2.5 h-2.5 ' + (sortField === f && sortDir === 'asc' ? 'text-brand-600 opacity-100' : 'text-slate-400')} fill="currentColor" viewBox="0 0 10 6"><path d="M5 0L0 6h10z"/></svg>
      <svg className={'w-2.5 h-2.5 ' + (sortField === f && sortDir === 'desc' ? 'text-brand-600 opacity-100' : 'text-slate-400')} fill="currentColor" viewBox="0 0 10 6"><path d="M5 6L0 0h10z"/></svg>
    </span>
  );

  return (
    <div className="p-4 md:p-6">
      {/* Toast */}
      {toast && (
        <div style={{animation: 'fadeInUp 0.3s ease-out'}} className="fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-lg text-sm font-semibold bg-emerald-600 text-white">
          <div className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>{toast}</div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">ORDENS DE SERVICO</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length} de {ordens.length} ordens</p>
        </div>
        <button onClick={abrirNova} className="btn-primary inline-flex items-center gap-2 text-xs px-4 py-2.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Nova OS
        </button>
      </div>

      {/* BUSCA + FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={busca} onChange={e => setBusca(e.target.value)} className="input-field pl-9 text-xs" placeholder="Buscar por cliente, placa, moto ou numero da OS..." />
          {busca && <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 flex-shrink-0">
          {([{ k: 'todas', l: 'Todas' }, { k: 'hoje', l: 'Hoje' }, { k: 'semana', l: 'Semana' }, { k: 'mes', l: 'Mes' }] as { k: FiltroPeriodo; l: string }[]).map(f => (
            <button key={f.k} onClick={() => setPeriodo(f.k)} className={'px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all duration-200 ' + (periodo === f.k ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50')}>{f.l}</button>
          ))}
        </div>
      </div>

      {/* TABELA */}
      {loading ? (
        <div className="card-table"><div className="p-6 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-12"/><div className="h-3 bg-slate-100 rounded flex-1"/><div className="h-3 bg-slate-100 rounded w-24"/><div className="h-3 bg-slate-100 rounded w-20"/><div className="h-3 bg-slate-100 rounded w-28"/><div className="h-3 bg-slate-100 rounded w-16"/>
            </div>
          ))}
        </div></div>
      ) : filtered.length === 0 ? (
        <div className="card-table">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">{ordens.length === 0 ? 'Nenhuma ordem de servico' : 'Nenhum resultado encontrado'}</p>
            <p className="text-xs text-slate-400 mb-5">{ordens.length === 0 ? 'Crie a primeira OS para comecar.' : 'Tente ajustar a busca ou os filtros.'}</p>
            {ordens.length === 0 && <button onClick={abrirNova} className="btn-primary text-xs px-5">Criar primeira OS</button>}
          </div>
        </div>
      ) : (
        <div className="card-table overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 sticky top-0">
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('numero')}>
                    <span className="inline-flex items-center">OS{sortArrow('numero')}</span>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('nomeCliente')}>
                    <span className="inline-flex items-center">Cliente{sortArrow('nomeCliente')}</span>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] hidden md:table-cell">Moto</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] hidden md:table-cell">Placa</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] hidden lg:table-cell cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('mecanico')}>
                    <span className="inline-flex items-center">Mecanico{sortArrow('mecanico')}</span>
                  </th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px] cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('status')}>
                    <span className="inline-flex items-center">Status{sortArrow('status')}</span>
                  </th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-500 uppercase tracking-wider text-[11px]">Valor</th>
                  <th className="text-center py-3 px-2 font-semibold text-slate-500 uppercase tracking-wider text-[11px] w-10">OS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((os, i) => {
                  const key = getStatusKey(os);
                  const badge = STATUS_BADGE[key] || { label: key, color: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
                  return (
                    <tr key={os.id} className={'border-b border-slate-50 hover:bg-slate-50/60 transition-colors duration-150 ' + (i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20')}>
                      <td onClick={() => abrirVer(os)} className="py-3 px-4 font-semibold text-brand-600 cursor-pointer">#{os.numero}</td>
                      <td onClick={() => abrirVer(os)} className="py-3 px-4 text-slate-700 font-medium cursor-pointer">{os.nomeCliente}</td>
                      <td onClick={() => abrirVer(os)} className="py-3 px-4 text-slate-500 cursor-pointer hidden md:table-cell">{os.modeloMoto || '—'}</td>
                      <td onClick={() => abrirVer(os)} className="py-3 px-4 text-slate-500 cursor-pointer hidden md:table-cell">{os.placaMoto || '—'}</td>
                      <td onClick={() => abrirVer(os)} className="py-3 px-4 text-slate-500 text-xs cursor-pointer hidden lg:table-cell">{os.mecanico?.name || '—'}</td>
                      <td onClick={() => abrirVer(os)} className="py-3 px-4 cursor-pointer">
                        <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ' + badge.color}>
                          <span className={'w-1.5 h-1.5 rounded-full ' + badge.dot}/>{badge.label}
                        </span>
                      </td>
                      <td onClick={() => abrirVer(os)} className="py-3 px-4 text-right font-semibold text-slate-700 cursor-pointer">{fm(Number(os.valorTotal) || 0)}</td>
                      <td className="py-3 px-2 text-center">
                        <button onClick={(e) => { e.stopPropagation(); imprimirOS(os); }} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-all duration-200" title="Imprimir OS">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVA OS */}
      {modal.open && modal.tipo === 'nova' && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 p-4 pt-6 overflow-y-auto" onClick={() => setModal({ open: false, tipo: 'nova' })}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl my-2" onClick={e => e.stopPropagation()} style={{animation: 'scaleIn 0.2s ease-out'}}>

            {/* CABECALHO */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                </div>
                <div><h2 className="text-base font-bold text-slate-800">Nova Ordem de Servico</h2><p className="text-xs text-slate-400">Preencha os dados do cliente e da moto</p></div>
              </div>
              <button onClick={() => setModal({ open: false, tipo: 'nova' })} className="text-slate-400 hover:text-slate-600 p-1"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>

            <div className="p-6 max-h-[62vh] overflow-y-auto space-y-6">
              {msg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs flex items-start gap-2">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  {msg}
                </div>
              )}

              {/* DADOS DO CLIENTE */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Dados do Cliente</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="col-span-3 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Nome <span className="text-red-500">*</span></label>
                    <input value={form.nomeCliente} onChange={e => setForm({ ...form, nomeCliente: e.target.value })} className={inputClass('nomeCliente')} placeholder="Nome completo" autoFocus />
                    {renderErro('nomeCliente')}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Telefone</label>
                    <input value={form.telefoneCliente} onChange={e => setForm({ ...form, telefoneCliente: e.target.value })} className="input-field mt-1" placeholder="(11) 99999-9999" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase">CPF</label>
                    <input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} className="input-field mt-1" placeholder="000.000.000-00" />
                  </div>
                </div>
              </div>

              {/* DADOS DA MOTO */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 4h2a2 2 0 012 2v2M3 10h2m14 0h2M7 8h10m-7 4v6m4-6v6M5 14h14v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4z"/><circle cx="7" cy="18" r={1.5} fill="currentColor"/><circle cx="17" cy="18" r={1.5} fill="currentColor"/></svg></div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Dados da Moto</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Marca</label>
                    <input value={form.marcaMoto} onChange={e => setForm({ ...form, marcaMoto: e.target.value })} className="input-field mt-1" placeholder="Ex: Honda" />
                  </div>
                  <div className="sm:col-span-2 relative">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Modelo</label>
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                      <input ref={motoInputRef} value={motoBusca || form.modeloMoto}
                        onChange={e => { setMotoBusca(e.target.value); setForm({ ...form, modeloMoto: e.target.value }); setMotoAberta(true); setMotoIndex(-1); }}
                        onFocus={() => { setMotoAberta(true); setMotoIndex(-1); }}
                        onKeyDown={motoKeyDown}
                        className={inputClass('modeloMoto') + ' pl-9'} placeholder="Buscar por marca, modelo ou cilindrada..." autoComplete="off" />
                      {form.modeloMoto && (
                        <button onClick={() => { setForm({ ...form, modeloMoto: '' }); setMotoBusca(''); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                    {renderErro('modeloMoto')}
                    {motoAberta && motosFiltradas.length > 0 && (
                      <div className="absolute z-30 bg-white border border-slate-200 rounded-xl shadow-2xl w-full mt-2 overflow-hidden" style={{maxHeight:'220px'}}>
                        <div className="overflow-y-auto max-h-[220px] py-1">
                          {motosFiltradas.map((m, i) => (
                            <button key={m} type="button" onMouseDown={() => selecionarMoto(m)} onMouseEnter={() => setMotoIndex(i)}
                              className={'w-full text-left px-4 py-2.5 text-sm transition-all flex items-center gap-3 ' + (i === motoIndex ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-slate-700 hover:bg-slate-50')}>{m}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Ano</label>
                    <input value={form.anoMoto} onChange={e => setForm({ ...form, anoMoto: e.target.value })} className={inputClass('anoMoto')} placeholder="Ex: 2022" />
                    {renderErro('anoMoto')}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Placa</label>
                    <input value={form.placaMoto} onChange={e => setForm({ ...form, placaMoto: e.target.value })} className={inputClass('placaMoto')} placeholder="AAA-0000" />
                    {renderErro('placaMoto')}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">KM</label>
                    <input value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} className="input-field mt-1" placeholder="Ex: 15.000" />
                  </div>
                </div>
              </div>

              {/* RESPONSAVEL */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Responsavel</h3>
                </div>
                <div className="max-w-sm">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Mecanico</label>
                  <select value={form.mecanicoId} onChange={e => setForm({ ...form, mecanicoId: e.target.value })} className={inputClass('mecanicoId')}>
                    <option value="">Selecionar mecanico...</option>
                    {mecanicos.map(m => (<option key={m.id} value={m.id}>{m.name}{m.emAlmoco ? ' (em almoco)' : ''}</option>))}
                  </select>
                  {renderErro('mecanicoId')}
                </div>
              </div>

              {/* SERVICOS */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg></div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Servicos</h3>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {TIPOS_SERVICO.map(s => {
                    const ativo = servicos.includes(s);
                    const ico = ICONES_SERVICO[s] || ICONES_SERVICO['Outros'];
                    return (
                      <button key={s} type="button" onClick={() => toggleServico(s)}
                        className={'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold border-2 transition-all duration-200 ' + (ativo ? 'bg-brand-600 text-white border-brand-600 shadow-sm shadow-brand-600/15' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300 hover:text-brand-600')}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={ico}/></svg>
                        {s}
                      </button>
                    );
                  })}
                </div>
                <div className="max-w-xs">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Revisao</label>
                  <select value={form.revisaoId} onChange={e => { const rev = revisoes.find(r => r.id === e.target.value); setForm({ ...form, revisaoId: e.target.value, valorMaoDeObra: rev ? String(rev.valor) : '0' }); }} className="input-field mt-1">
                    <option value="">Sem revisao</option>
                    {revisoes.map(r => (<option key={r.id} value={r.id}>{r.nome} — {fm(r.valor)}</option>))}
                  </select>
                </div>
              </div>

              {/* PROBLEMA + OBSERVACOES */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center"><svg className="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg></div>
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Problema e Observacoes</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Problema relatado</label>
                    <textarea value={form.descricaoProblema} onChange={e => setForm({ ...form, descricaoProblema: e.target.value })} className="input-field mt-1 resize-none" rows={3} placeholder="Descreva o problema relatado pelo cliente..." />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Observacoes</label>
                    <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input-field mt-1 resize-none" rows={2} placeholder="Observacoes importantes, pecas ja diagnosticadas, detalhes..." />
                  </div>
                </div>
              </div>
            </div>

            {/* RODAPE */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-2xl">
              <button onClick={() => setModal({ open: false, tipo: 'nova' })} className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200">Cancelar</button>
              <button onClick={criarOS} className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/15 transition-all duration-200">Criar Ordem de Servico</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver OS */}
      {modal.open && modal.tipo === 'ver' && modal.os && (
        <DetalheOSBalcao os={modal.os} onClose={handleCloseModal} />
      )}
    </div>
  );
}
