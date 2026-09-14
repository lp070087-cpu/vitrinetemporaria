'use client';

import { useState, useEffect, useCallback } from 'react';
import { imprimirNotaServico } from '@/lib/imprimirNotaServico';
import { mascaraMoeda, parseMoeda, fmtMoeda } from '@/lib/moeda-utils';

interface Peca { id: string; nome: string; codigo: string; precoVenda: number; quantidade: number; compatibilidade?: string; categoria: { nome: string }; }
interface ItemOS { id: string; peca: Peca; quantidade: number; precoUnitario: number; adaptado?: boolean; }
interface Mecanico { id: string; name: string; emAlmoco: boolean; }
interface ServicoOS { id: string; nome: string; valor: number; }
interface OS {
  id: string; numero: number; nomeCliente: string; telefoneCliente: string;
  modeloMoto: string; placaMoto?: string; anoMoto?: string;
  descricaoProblema: string; diagnostico?: string; tipoServico?: string;
  status: string; valorTotal: number; valorMaoDeObra: number;
  mecanico?: Mecanico; mecanicoId?: string; balcao?: { name: string };
  itens: ItemOS[]; notaFiscal?: { id: string; numero: string; chaveAcesso?: string; dataServico?: string; emitidaEm: string };
  statusPagamento?: string | null; formaPagamento?: string | null;
  servicos?: ServicoOS[]; inicioServico?: string | null; fimServico?: string | null;
  desconto?: number;
}

const TIPOS_SERVICO = ['Revisao', 'Troca de oleo', 'Eletrica', 'Suspensao', 'Freios', 'Motor', 'Transmissao', 'Pneus', 'Geral'];

const MODELOS_MOTO = ['CG 160','Titan 160','Bros 160','Factor 150','Fazer 250','NMax 160','PCX 150','XRE 300','CB 300F','CG 125','CG Titan 150','Biz 125','Pop 110i','Elite 125','Twister 250','CB 500F','MT-03','XTZ 250','Lander 250','Crosser 150'];

export default function OrdensPage() {
  const [ordens, setOrdens] = useState<OS[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('ABERTAS');
  const [modal, setModal] = useState<{ open: boolean; tipo: 'nova' | 'ver'; os?: OS }>({ open: false, tipo: 'nova' });
  const [form, setForm] = useState({ nomeCliente: '', telefoneCliente: '', modeloMoto: '', placaMoto: '', anoMoto: '', descricaoProblema: '', mecanicoId: '' });
  const [servicos, setServicos] = useState<string[]>([]);
  const [mecanicos, setMecanicosLista] = useState<Mecanico[]>([]);
  const [msg, setMsg] = useState('');

  const fetchOrdens = useCallback(async () => {
    const statusMap: Record<string, string> = { ABERTAS: '', ABERTA: 'ABERTA', EM_ANDAMENTO: 'EM_ANDAMENTO', AGUARDANDO_PECAS: 'AGUARDANDO_PECAS', CONCLUIDAS: 'CONCLUIDA', AGUARDANDO_PAGAMENTO: 'AGUARDANDO_PAGAMENTO' };
    setLoading(true);
    if (filtro === 'AGUARDANDO_PAGAMENTO') {
      const res = await fetch('/api/ordens');
      const data = await res.json();
      setOrdens(data.filter((o: OS) => o.statusPagamento === 'AGUARDANDO_PAGAMENTO'));
      setLoading(false);
      return;
    }
    const p = new URLSearchParams();
    if (statusMap[filtro]) p.set('status', statusMap[filtro]);
    const res = await fetch(`/api/ordens?${p}`); setOrdens(await res.json()); setLoading(false);
  }, [filtro]);

  useEffect(() => { fetchOrdens(); fetch('/api/mecanicos').then(r=>r.json()).then(setMecanicosLista).catch(()=>{}); }, [fetchOrdens]);

  function toggleServico(s: string) {
    setServicos(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function criarOS() {
    if (!form.nomeCliente || !form.telefoneCliente || !form.modeloMoto) { setMsg('Preencha os campos obrigatorios.'); return; }
    const body = { ...form, tipoServico: servicos.join(', ') };
    const res = await fetch('/api/ordens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      setModal({ open: false, tipo: 'nova' }); setForm({ nomeCliente:'',telefoneCliente:'',modeloMoto:'',placaMoto:'',anoMoto:'',descricaoProblema:'',mecanicoId:'' }); setServicos([]); fetchOrdens(); setMsg('');
    } else { const e = await res.json(); setMsg(e.error || 'Erro ao criar OS.'); }
  }

  function abrirNova() { setForm({ nomeCliente:'',telefoneCliente:'',modeloMoto:'',placaMoto:'',anoMoto:'',descricaoProblema:'',mecanicoId:'' }); setServicos([]); setMsg(''); setModal({ open:true, tipo:'nova' }); }
  function abrirVer(os: OS) { setModal({ open: true, tipo: 'ver', os }); }

  const formatMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const statusColor: Record<string, string> = { ABERTA:'bg-sky-50 text-sky-700 border-sky-200',EM_ANDAMENTO:'bg-amber-50 text-amber-700 border-amber-200',AGUARDANDO_PECAS:'bg-orange-50 text-orange-700 border-orange-200',PRONTA:'bg-violet-50 text-violet-700 border-violet-200',CONCLUIDA:'bg-emerald-50 text-emerald-700 border-emerald-200',CANCELADA:'bg-red-50 text-red-700 border-red-200',AGUARDANDO_PAGAMENTO:'bg-amber-50 text-amber-700 border-amber-200',ENTREGUE:'bg-emerald-50 text-emerald-700 border-emerald-200' };
  const statusLabel: Record<string, string> = { ABERTA:'Aberta',EM_ANDAMENTO:'Em andamento',AGUARDANDO_PECAS:'Aguard. pecas',PRONTA:'Pronta',CONCLUIDA:'Concluida',CANCELADA:'Cancelada',AGUARDANDO_PAGAMENTO:'Aguard. Pagamento',ENTREGUE:'Entregue' };

  function getStatusDisplay(os: OS) {
    if (os.statusPagamento === 'AGUARDANDO_PAGAMENTO') return { label: statusLabel.AGUARDANDO_PAGAMENTO, color: statusColor.AGUARDANDO_PAGAMENTO };
    if (os.statusPagamento === 'ENTREGUE') return { label: statusLabel.ENTREGUE, color: statusColor.ENTREGUE };
    if (os.statusPagamento === 'PAGO') return { label: 'Pago', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    return { label: statusLabel[os.status] || os.status, color: statusColor[os.status] || 'bg-slate-50 text-slate-500 border-slate-200' };
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-xl font-bold text-slate-800 tracking-tight">ORDENS DE SERVICO</h1><p className="text-sm text-slate-500 mt-0.5">{ordens.length} ordens</p></div>
        <button onClick={abrirNova} className="btn-primary inline-flex items-center gap-2 text-xs"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Nova OS</button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['ABERTAS','ABERTA','EM_ANDAMENTO','AGUARDANDO_PECAS','CONCLUIDAS','AGUARDANDO_PAGAMENTO'].map(f => (<button key={f} onClick={()=>setFiltro(f)} className={`px-3 py-1.5 rounded text-xs font-medium border transition-colors ${filtro===f?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{f==='AGUARDANDO_PAGAMENTO'?'Aguard. Pagamento':statusLabel[f]||'Todas'}</button>))}
      </div>

      {loading ? <p className="text-sm text-slate-400">Carregando...</p> : ordens.length===0 ? (<div className="card text-center py-12"><p className="text-sm text-slate-400">Nenhuma OS encontrada.</p></div>) : (
        <div className="card overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-slate-100"><th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">OS</th><th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">Cliente</th><th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">Moto</th><th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">Servico</th><th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">Mecanico</th><th className="text-left py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">Status</th><th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">Valor</th><th className="text-right py-2.5 px-3 text-xs font-medium text-slate-500 uppercase">NF</th></tr></thead>
          <tbody>{ordens.map(os => {
            const st = getStatusDisplay(os);
            return (
            <tr key={os.id} onClick={()=>abrirVer(os)} className="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer">
              <td className="py-2 px-3 font-medium text-brand-600">#{os.numero}</td>
              <td className="py-2 px-3 text-slate-700">{os.nomeCliente}</td>
              <td className="py-2 px-3 text-slate-500">{os.modeloMoto}</td>
              <td className="py-2 px-3 text-xs text-slate-500">{os.tipoServico||'-'}</td>
              <td className="py-2 px-3 text-slate-500 text-xs">{os.mecanico?.name||'-'}</td>
              <td className="py-2 px-3"><span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${st.color}`}>{st.label}</span></td>
              <td className="py-2 px-3 text-right font-medium text-slate-700">{formatMoney(Number(os.valorTotal))}</td>
              <td className="py-2 px-3 text-right text-xs">{os.notaFiscal?<span className="text-emerald-600 font-medium">#{os.notaFiscal.numero}</span>:<span className="text-slate-300">-</span>}</td>
            </tr>
          )})}</tbody>
        </table></div>
      )}

      {modal.open && modal.tipo==='nova' && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Nova Ordem de Servico</h2>
            {msg&&<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs mb-4">{msg}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Nome do cliente *</label><input value={form.nomeCliente} onChange={e=>setForm({...form,nomeCliente:e.target.value})} className="input-field mt-1"/></div>
              <div><label className="text-xs font-medium text-slate-600">Telefone *</label><input value={form.telefoneCliente} onChange={e=>setForm({...form,telefoneCliente:e.target.value})} className="input-field mt-1" placeholder="(11) 99999-9999"/></div>
              <div><label className="text-xs font-medium text-slate-600">Modelo da moto *</label>
                <input value={form.modeloMoto} onChange={e=>setForm({...form,modeloMoto:e.target.value})} className="input-field mt-1" placeholder="Digite o modelo..." list="modelos-dono"/>
                <datalist id="modelos-dono">{MODELOS_MOTO.map(m=><option key={m} value={m}/>)}</datalist>
              </div>
              <div><label className="text-xs font-medium text-slate-600">Mecanico</label>
                <select value={form.mecanicoId} onChange={e=>setForm({...form,mecanicoId:e.target.value})} className="input-field mt-1"><option value="">Selecionar...</option>{mecanicos.map(m=>(<option key={m.id} value={m.id}>{m.name}{m.emAlmoco?' (almoco)':''}</option>))}</select>
              </div>
              <div><label className="text-xs font-medium text-slate-600">Placa</label><input value={form.placaMoto} onChange={e=>setForm({...form,placaMoto:e.target.value})} className="input-field mt-1"/></div>
              <div><label className="text-xs font-medium text-slate-600">Ano</label><input value={form.anoMoto} onChange={e=>setForm({...form,anoMoto:e.target.value})} className="input-field mt-1"/></div>
              {/* Tipos de servico */}
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-600 mb-2 block">Tipo de servico:</label>
                <div className="flex flex-wrap gap-1.5">
                  {TIPOS_SERVICO.map(s => (
                    <button key={s} type="button" onClick={()=>toggleServico(s)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${servicos.includes(s)?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-600 border-slate-200 hover:border-brand-300'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="col-span-2"><label className="text-xs font-medium text-slate-600">Problema relatado / Observacoes do cliente</label><textarea value={form.descricaoProblema} onChange={e=>setForm({...form,descricaoProblema:e.target.value})} className="input-field mt-1" rows={3}/></div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100"><button onClick={()=>setModal({open:false,tipo:'nova'})} className="btn-secondary text-xs">Cancelar</button><button onClick={criarOS} className="btn-primary text-xs">Criar OS</button></div>
          </div>
        </div>
      )}

      {modal.open && modal.tipo==='ver' && modal.os && (<DetalheOS os={modal.os} onClose={()=>{setModal({open:false,tipo:'ver'});fetchOrdens();}}/>)}
    </div>
  );
}

function getCompatBadge(peca: Peca, modeloMoto: string): { label: string; color: string } {
  const comp = (peca.compatibilidade||'').toLowerCase(); const modelo = modeloMoto.toLowerCase();
  if (comp.includes('universal')) return { label:'Universal', color:'bg-violet-50 text-violet-700 border-violet-200' };
  if (comp.includes(modelo)) return { label:'Compativel', color:'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label:'Adaptada', color:'bg-amber-50 text-amber-700 border-amber-200' };
}

function DetalheOS({ os, onClose }: { os: OS; onClose: () => void }) {
  const [tab, setTab] = useState<'itens'|'status'|'nf'>('itens');
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [mecId, setMecId] = useState(os.mecanicoId||'');
  const [diagnostico, setDiagnostico] = useState(os.diagnostico||'');
  const [novoStatus, setNovoStatus] = useState(os.status);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [pecaId, setPecaId] = useState('');
  const [qtd, setQtd] = useState('1');
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [nfNumero, setNfNumero] = useState('');
  const [nfChave, setNfChave] = useState('');
  const [nfDataServico, setNfDataServico] = useState('');
  const [msg, setMsg] = useState('');
  const [dados, setDados] = useState<OS>(os);
  // Mão de obra em formato monetário pt-BR (máscara de maquininha) — nunca
  // "11.00000". parseMoeda devolve o número para o backend.
  const [maoDeObraStr, setMaoDeObraStr] = useState(fmtMoeda(Number(os.valorMaoDeObra) || 0));
  const [salvandoMao, setSalvandoMao] = useState(false);

  const carregarPecas = async (todas: boolean) => {
    const p = new URLSearchParams(); if (dados.modeloMoto&&!todas) p.set('modelo',dados.modeloMoto); if (todas) p.set('todas','1');
    const res = await fetch(`/api/pecas?${p}`); setPecas(await res.json());
  };
  // Recarrega o detalhe completo da OS (servicos, inicioServico, fimServico, notaFiscal) para a reimpressão ter dados atuais
  const carregarDetalhe = async () => {
    const res = await fetch(`/api/ordens/${dados.id}`);
    if (res.ok) { const u = await res.json(); if (u && u.id) setDados(u); }
  };
  useEffect(()=>{ fetch('/api/mecanicos').then(r=>r.json()).then(setMecanicos).catch(()=>{}); carregarPecas(false); carregarDetalhe(); },[]);
  function toggleMostrarTodas(){const n=!mostrarTodas;setMostrarTodas(n);carregarPecas(n);}

  const formatMoney=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const statusColor: Record<string,string>={ABERTA:'bg-sky-50 text-sky-700 border-sky-200',EM_ANDAMENTO:'bg-amber-50 text-amber-700 border-amber-200',AGUARDANDO_PECAS:'bg-orange-50 text-orange-700 border-orange-200',PRONTA:'bg-violet-50 text-violet-700 border-violet-200',CONCLUIDA:'bg-emerald-50 text-emerald-700 border-emerald-200',CANCELADA:'bg-red-50 text-red-700 border-red-200'};
  const statusLabel: Record<string,string>={ABERTA:'Aberta',EM_ANDAMENTO:'Em andamento',AGUARDANDO_PECAS:'Aguard. pecas',PRONTA:'Pronta',CONCLUIDA:'Concluida',CANCELADA:'Cancelada'};

  async function atualizarStatus(){const mdo=(document.getElementById('maoDeObraStatus')as HTMLInputElement);const v=mdo?parseFloat(mdo.value)||0:undefined;const res=await fetch(`/api/ordens/${dados.id}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:novoStatus,mecanicoId:mecId||null,diagnostico:diagnostico||null,valorMaoDeObra:v})});if(res.ok){const u=await res.json();setDados(u);setMsg('');}else{const e=await res.json();setMsg(e.error||'Erro.');}}

  // Salva SOMENTE a mão de obra (fonte única do total). Não reenvia `status`,
  // então não quebra para OS históricas com status legado (ex.: LAVAGEM). Após
  // salvar, recarrega o detalhe completo para a reimpressão da Nota do Cliente
  // trazer notaFiscal/servicos/inicio/fim atualizados.
  async function salvarMaoDeObra() {
    const v = parseMoeda(maoDeObraStr);
    setSalvandoMao(true);
    setMsg('');
    try {
      const res = await fetch(`/api/ordens/${dados.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorMaoDeObra: v }),
      }).catch(() => null);
      if (!res) { setMsg('Erro ao salvar a mão de obra.'); return; }
      const u = await res.json();
      if (!res.ok) { setMsg(u?.error || 'Erro ao salvar a mão de obra.'); return; }
      setMaoDeObraStr(fmtMoeda(Number(u.valorMaoDeObra) || 0));
      await carregarDetalhe();
    } catch { setMsg('Erro ao salvar a mão de obra.'); }
    finally { setSalvandoMao(false); }
  }
  async function addItem(){if(!pecaId)return;const res=await fetch(`/api/ordens/${dados.id}/itens`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pecaId,quantidade:Number(qtd)||1})});if(res.ok){const u=await res.json();setDados(u);setPecaId('');setQtd('1');setMsg('');}else{const e=await res.json();setMsg(e.error||'Erro ao adicionar peca.');}}
  async function removeItem(itemId:string){const res=await fetch(`/api/ordens/${dados.id}/itens`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({itemId})});if(res.ok){const u=await res.json();setDados(u);}}
  async function emitirNF(){if(!nfNumero){setMsg('Informe o numero da nota.');return;}const res=await fetch('/api/notas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ordemServicoId:dados.id,numero:nfNumero,chaveAcesso:nfChave||null,dataServico:nfDataServico||null})});if(res.ok){const nf=await res.json();setDados({...dados,notaFiscal:{id:nf.id,numero:nf.numero,dataServico:nf.dataServico||nf.emitidaEm,emitidaEm:nf.emitidaEm}});setNfNumero('');setNfChave('');setNfDataServico('');setMsg('');}else{const e=await res.json();setMsg(e.error||'Erro ao emitir NF.');}}
  async function atualizarDataServico(){if(!dados.notaFiscal)return;const dataEdit=(document.getElementById('nfDataServicoEdit')as HTMLInputElement);if(!dataEdit||!dataEdit.value){setMsg('Informe a data do servico.');return;}const res=await fetch('/api/notas',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ordemServicoId:dados.id,dataServico:dataEdit.value})});if(res.ok){const nf=await res.json();setDados({...dados,notaFiscal:{id:nf.id,numero:nf.numero,dataServico:nf.dataServico||nf.emitidaEm,emitidaEm:nf.emitidaEm}});setMsg('');}else{const e=await res.json();setMsg(e.error||'Erro ao atualizar data do servico.');}}
  function linkWhatsApp(){const texto=encodeURIComponent(`Ola ${dados.nomeCliente}! Sua OS #${dados.numero} - ${dados.modeloMoto}. Valor: ${formatMoney(Number(dados.valorTotal))}. ${dados.notaFiscal?`NF: ${dados.notaFiscal.numero}`:''}`);window.open(`https://wa.me/55${dados.telefoneCliente.replace(/\D/g,'')}?text=${texto}`,'_blank');}
  const [emitindoNF, setEmitindoNF] = useState(false);
  async function emitirEImprimirNF(){
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
          setMsg(data?.error || 'Erro ao emitir a nota.');
          return;
        }
        nf = { id: data.id, numero: data.numero, chaveAcesso: data.chaveAcesso, dataServico: data.dataServico, emitidaEm: data.emitidaEm };
        setDados({ ...dados, notaFiscal: nf });
      }
      imprimirNotaServico({ ...(dados as any), notaFiscal: nf });
    } catch {
      setMsg('Erro ao emitir a nota.');
    } finally {
      setEmitindoNF(false);
    }
  }

  const pecasOrdenadas=[...pecas].sort((a,b)=>{const ba=getCompatBadge(a,dados.modeloMoto);const bb=getCompatBadge(b,dados.modeloMoto);const o={'Compativel':0,'Universal':1,'Adaptada':2};return(o[ba.label as keyof typeof o]??3)-(o[bb.label as keyof typeof o]??3);});
  const qtdCompativeis=pecas.filter(p=>getCompatBadge(p,dados.modeloMoto).label!=='Adaptada').length;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">OS #{dados.numero}</h2>
            <p className="text-sm text-slate-500">{dados.nomeCliente} - {dados.modeloMoto}{dados.placaMoto?` (${dados.placaMoto})`:''}</p>
            {dados.tipoServico && <p className="text-xs text-slate-400 mt-0.5">Servico: {dados.tipoServico}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div className="flex border-b border-slate-100 flex-shrink-0">
          <button className="px-4 py-2 text-xs font-medium border-b-2 border-brand-600 text-brand-600">
            Peças e Valores
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {msg&&<div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs mb-4">{msg}</div>}
          <div>
            <div className="flex items-center justify-between mb-3 p-2.5 bg-slate-50 rounded-lg text-xs"><span className="text-slate-600">Mostrando <strong className="text-slate-800">{qtdCompativeis}</strong> pecas compativeis com <strong className="text-brand-600">{dados.modeloMoto}</strong></span><button onClick={toggleMostrarTodas} className={`text-xs font-medium px-3 py-1 rounded transition-colors ${mostrarTodas?'bg-amber-100 text-amber-700 hover:bg-amber-200':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{mostrarTodas?'Mostrar so compativeis':'Mostrar outras pecas / Adaptar'}</button></div>
            <div className="flex gap-2 mb-4"><select value={pecaId} onChange={e=>setPecaId(e.target.value)} className="input-field flex-1 text-xs"><option value="">Selecionar peca...</option>{pecasOrdenadas.map(p=>{const badge=getCompatBadge(p,dados.modeloMoto);return(<option key={p.id} value={p.id}>{p.codigo} - {p.nome} ({formatMoney(Number(p.precoVenda))}) [{badge.label}]</option>);})}</select><input type="number" value={qtd} onChange={e=>setQtd(e.target.value)} className="input-field w-20 text-xs" min="1"/><button onClick={addItem} className="btn-primary text-xs px-3">+</button></div>
            {dados.itens.length===0?(<p className="text-xs text-slate-400 py-4">Nenhuma peca adicionada.</p>):(<table className="w-full text-xs"><thead><tr className="border-b border-slate-100"><th className="text-left py-2 font-medium text-slate-500">Peca</th><th className="text-center py-2 font-medium text-slate-500 w-[80px]">Compat.</th><th className="text-right py-2 font-medium text-slate-500">Qtd</th><th className="text-right py-2 font-medium text-slate-500">Unit.</th><th className="text-right py-2 font-medium text-slate-500">Total</th><th className="text-right py-2 font-medium text-slate-500"></th></tr></thead><tbody>{dados.itens.map(i=>{const badge=getCompatBadge(i.peca,dados.modeloMoto);const isAdaptado=i.adaptado||badge.label==='Adaptada';const bl=isAdaptado?'Adaptada':badge.label;const bc=isAdaptado?'bg-amber-50 text-amber-700 border-amber-200':badge.color;return(<tr key={i.id} className="border-b border-slate-50"><td className="py-1.5 text-slate-700">{i.peca.nome}</td><td className="py-1.5 text-center"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${bc}`}>{bl}</span></td><td className="py-1.5 text-right">{i.quantidade}</td><td className="py-1.5 text-right text-slate-500">{formatMoney(Number(i.precoUnitario))}</td><td className="py-1.5 text-right font-medium">{formatMoney(Number(i.precoUnitario)*i.quantidade)}</td><td className="py-1.5 text-right"><button onClick={()=>removeItem(i.id)} className="text-red-500 hover:text-red-700 text-[11px]">Remover</button></td></tr>);})}</tbody><tfoot><tr><td colSpan={3}></td><td className="py-1.5 text-right text-xs text-slate-500">Mao de obra</td><td className="py-1.5 text-right text-sm text-slate-700">{formatMoney(Number(dados.valorMaoDeObra))}</td><td></td></tr><tr className="font-semibold"><td colSpan={4} className="py-2 text-right text-xs text-slate-500 border-t border-slate-100">Total</td><td className="py-2 text-right text-sm text-slate-800 border-t border-slate-100">{formatMoney(Number(dados.valorTotal))}</td><td className="border-t border-slate-100"></td></tr></tfoot></table>)}
            <div className="mt-4 flex items-center gap-2 p-3 bg-slate-50 rounded-lg"><span className="text-xs text-slate-500 font-medium">Mao de obra:</span><input value={maoDeObraStr} onChange={e=>setMaoDeObraStr(mascaraMoeda(e.target.value, maoDeObraStr))} inputMode="numeric" className="input-field w-32 text-xs text-right" placeholder="0,00"/><button onClick={salvarMaoDeObra} disabled={salvandoMao} className="btn-primary text-xs px-3 disabled:opacity-50">{salvandoMao?'Salvando...':'Salvar'}</button></div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-shrink-0"><span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${statusColor[dados.status]}`}>{statusLabel[dados.status]}</span><div className="flex items-center gap-3 flex-wrap"><span className="text-sm text-slate-500">Tel: {dados.telefoneCliente}</span><button onClick={emitirEImprimirNF} disabled={emitindoNF} className="text-xs font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50">{emitindoNF ? 'Emitindo...' : dados.notaFiscal ? 'Nota do Cliente' : 'Emitir Nota do Cliente'}</button><button onClick={linkWhatsApp} className="text-xs font-medium text-emerald-600 hover:text-emerald-700">WhatsApp</button></div></div>
      </div>
    </div>
  );
}
