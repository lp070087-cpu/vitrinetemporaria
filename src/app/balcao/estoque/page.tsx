'use client';

import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import CarrinhoLateral, { CarrinhoLateralItem } from '@/components/pdv/CarrinhoLateral';
import { pecaMatchBusca } from '@/lib/peca-utils';
import { DADOS_EMPRESA } from '@/lib/imprimirNotaServico';

interface Categoria { id: string; nome: string; slug: string; }
interface Peca { id: string; nome: string; codigo: string; codigoBarras?: string; subcategoria?: string; marca?: string; compatibilidade?: string; tamanho?: string | null; genero?: string | null; precoVenda: number; precoCusto: number; quantidade: number; quantidadeLoja: number; quantidadeCentral: number; estoqueMinimo: number; descricao?: string; categoriaId: string; categoria: { nome: string }; }

type View = 'categorias' | 'subcategorias' | 'pecas';

const iconeCategoria = (slug: string) => {
  const icons: Record<string, React.ReactNode> = {
    motor: <svg className="w-9 h-9 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 3h4v4H4V3zm8 14h4v4h-4v-4zM4 13h4v4H4v-4zm8-10h4v4h-4V3zm-2 4V3m0 18v-4M3 7h4m-4 4h4m10-2h4m-4 4h4M6 17v-2m12-8v2M6 7v2m12 10v-2M12 7v10"/></svg>,
    freios: <svg className="w-9 h-9 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.5}/><circle cx="12" cy="12" r="4" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v2m0 14v2M3 12h2m14 0h2"/></svg>,
    eletrica: <svg className="w-9 h-9 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 2h10l-2 8h4l-8 12 2-8H7L9 2z"/></svg>,
    suspensao: <svg className="w-9 h-9 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 3h8M8 3v3m8-3v3M8 6h8M6 9h12v2l-10 10H8V9z"/></svg>,
    transmissao: <svg className="w-9 h-9 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="6" r="2" strokeWidth={1.5}/><circle cx="19" cy="6" r="2" strokeWidth={1.5}/><circle cx="12" cy="18" r="2" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 6h10M5 8v8m14-10v8m-7 4v-6M5 18h14"/></svg>,
    carroceria: <svg className="w-9 h-9 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 4h2a2 2 0 012 2v2M3 10h2m14 0h2M7 8h10m-7 4v6m4-6v6M5 14h14v4a2 2 0 01-2 2H7a2 2 0 01-2-2v-4z"/><circle cx="7" cy="18" r="1.5" fill="currentColor"/><circle cx="17" cy="18" r="1.5" fill="currentColor"/></svg>,
    'rodas-e-pneus': <svg className="w-9 h-9 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" strokeWidth={1.5}/><circle cx="12" cy="12" r="4" strokeWidth={1.5}/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M18.4 5.6l-2.1 2.1M5.4 18.4l2.1-2.1"/></svg>,
    'oleos-e-fluidos': <svg className="w-9 h-9 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 4h12l-2 8H8L6 4zm2 8v6a2 2 0 002 2h4a2 2 0 002-2v-6M5 6h14M4 10h16"/></svg>,
    escapamento: <svg className="w-9 h-9 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 10h4l2-4h4l2 4h4v4H4v-4zm2 4v2a2 2 0 002 2h8a2 2 0 002-2v-2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 18v4m8-4v4" opacity={0.4}/></svg>,
    acessorios: <svg className="w-9 h-9 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h4l-2 4h4" opacity={0.6}/></svg>,
  };
  return icons[slug] || icons.acessorios;
};

// Sentinela de UI — nunca vai para o banco
const NO_SUBCAT = '__sem_subcategoria__';
const LABEL_SEM_SUBCATEGORIA = 'Sem subcategoria';

export default function BalcaoEstoque() {
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [view, setView] = useState<View>('categorias');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | null>(null);
  const [subcategoriaSelecionada, setSubcategoriaSelecionada] = useState<string | null>(null);
  const [modal, setModal] = useState<{ open: boolean; peca?: Peca }>({ open: false });
  // BALCAO não edita preços: form sem precoVenda/precoCusto
  const [form, setForm] = useState({ nome: '', codigo: '', descricao: '', subcategoria: '', marca: '', compatibilidade: '', quantidade: '', estoqueMinimo: '5', categoriaId: '' });
  const [msg, setMsg] = useState('');

  useEffect(()=>{Promise.all([fetch('/api/categorias').then(r=>r.json()),fetch('/api/pecas').then(r=>r.json())]).then(([cats,pecasData])=>{setCategorias(cats);setPecas(pecasData);setLoading(false);}).catch(()=>setLoading(false));},[]);
  const fetchPecas=async()=>{const res=await fetch('/api/pecas');setPecas(await res.json());};
  // Busca tokenizada: nome, SKU, codigoBarras, marca e compatibilidade
  const pecasFiltradas=pecas.filter(p=>{const qb=busca.trim();if(!qb)return true;return pecaMatchBusca(p, qb, ['nome','codigo','codigoBarras','marca','compatibilidade']);});
  const totalPecas=pecas.reduce((acc,p)=>acc+(p.quantidadeLoja||0),0);const estoqueBaixo=pecas.filter(p=>(p.quantidadeLoja||0)<=p.estoqueMinimo).length;
  const categoriasComContagem=useMemo(()=>categorias.map(c=>({...c,_count:{pecas:pecas.filter(p=>p.categoriaId===c.id).length}})).filter(c=>c._count.pecas>0),[categorias,pecas]);
  const subcategorias=categoriaSelecionada?[...new Set(pecas.filter(p=>p.categoriaId===categoriaSelecionada.id&&p.subcategoria).map(p=>p.subcategoria!))].sort() : [];
  const temSemSubcategoria = categoriaSelecionada ? pecas.some(p=>p.categoriaId===categoriaSelecionada.id&&!p.subcategoria) : false;
  const subcategoriasContagem=useMemo(()=>{if(!categoriaSelecionada)return new Map();const map=new Map<string,{count:number;baixas:number}>();for(const p of pecas){if(p.categoriaId!==categoriaSelecionada.id||!p.subcategoria)continue;const e=map.get(p.subcategoria)||{count:0,baixas:0};e.count++;(p.quantidadeLoja||0)<=p.estoqueMinimo&&e.baixas++;map.set(p.subcategoria,e);}if(temSemSubcategoria){const sem=pecas.filter(p=>p.categoriaId===categoriaSelecionada.id&&!p.subcategoria);const baixas=sem.filter(p=>(p.quantidadeLoja||0)<=p.estoqueMinimo).length;map.set(NO_SUBCAT,{count:sem.length,baixas});}return map;},[pecas,categoriaSelecionada,temSemSubcategoria]);
  const pecasNivel=view==='pecas'&&categoriaSelecionada&&subcategoriaSelecionada?pecasFiltradas.filter(p=>p.categoriaId===categoriaSelecionada.id&&(subcategoriaSelecionada===NO_SUBCAT?!p.subcategoria:p.subcategoria===subcategoriaSelecionada)):[];

  // BUSCA GLOBAL (AJUSTE 3) — enquanto houver texto digitado, a pesquisa vale
  // para TODO o estoque da loja, em qualquer nível (categorias, subcategorias ou
  // peças). Reutiliza exatamente o mesmo `pecasFiltradas` da listagem normal:
  // nome, SKU/codigo, codigoBarras, marca e compatibilidade. Limpar a busca
  // volta para os cards de categorias.
  const buscaAtiva = busca.trim().length > 0;
  const resultadoGlobal = buscaAtiva ? pecasFiltradas : [];
  const totalLojaFiltrado = resultadoGlobal.reduce((s,p)=>s+(p.quantidadeLoja||0),0);
  // Fonte única da listagem renderizada: dentro de categoria/subcategoria usa o
  // recorte do nível (que já respeita a busca); fora dele usa o resultado global.
  const listaRender = view==='pecas' ? pecasNivel : resultadoGlobal;

  // Rótulo amigável para exibição (nunca mostrar o sentinela cru)
  const labelSubcategoria = subcategoriaSelecionada === NO_SUBCAT ? LABEL_SEM_SUBCATEGORIA : subcategoriaSelecionada;

  function selecionarCategoria(cat:Categoria){setCategoriaSelecionada(cat);setSubcategoriaSelecionada(null);setView('subcategorias');setBusca('');}
  function selecionarSubcategoria(sub:string){setSubcategoriaSelecionada(sub);setView('pecas');}
  function voltarNivel(){if(view==='pecas'){setSubcategoriaSelecionada(null);setView('subcategorias');}else if(view==='subcategorias'){setCategoriaSelecionada(null);setView('categorias');}setBusca('');}
  function irParaCategorias(){setCategoriaSelecionada(null);setSubcategoriaSelecionada(null);setView('categorias');setBusca('');}
  function abrirForm(peca?:Peca){
    if(peca){setForm({nome:peca.nome,codigo:peca.codigo,descricao:peca.descricao||'',subcategoria:peca.subcategoria&&peca.subcategoria!==NO_SUBCAT?peca.subcategoria:'',marca:peca.marca||'',compatibilidade:peca.compatibilidade||'',quantidade:String(peca.quantidade),estoqueMinimo:String(peca.estoqueMinimo),categoriaId:peca.categoriaId});setModal({open:true,peca});}
    else{setForm({nome:'',codigo:'',descricao:'',subcategoria:subcategoriaSelecionada&&subcategoriaSelecionada!==NO_SUBCAT?subcategoriaSelecionada:'',marca:'',compatibilidade:'',quantidade:'',estoqueMinimo:'5',categoriaId:categoriaSelecionada?.id||''});setModal({open:true});}
  }
  async function salvar(){
    if(!form.nome||!form.codigo||!form.categoriaId){setMsg('Preencha nome, codigo e categoria.');return;}
    // Subcategoria nunca carrega o sentinela para o banco
    const subcategoria = form.subcategoria.trim();
    const body={nome:form.nome,codigo:form.codigo,descricao:form.descricao,subcategoria:subcategoria||'',marca:form.marca,compatibilidade:form.compatibilidade,quantidade:Number(form.quantidade)||0,estoqueMinimo:Number(form.estoqueMinimo)||5,categoriaId:form.categoriaId};
    const url=modal.peca?`/api/pecas/${modal.peca.id}`:'/api/pecas';const method=modal.peca?'PUT':'POST';
    const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){setModal({open:false});fetchPecas();setMsg('');}else{const e=await res.json();setMsg(e.error||'Erro ao salvar.');}
  }
  async function remover(id:string){if(!confirm('Remover esta peca?'))return;await fetch(`/api/pecas/${id}`,{method:'DELETE'});fetchPecas();}
  function exportarCSV(){const data=listaRender;const headers=['SKU','Cod.Barras','Peca','Marca','Compatibilidade','Tamanho','Genero','Categoria','Preco','Estoque','Status'];const grupos=new Map<string,Peca[]>();for(const p of data){const c=p.categoria.nome||'Sem categoria';if(!grupos.has(c))grupos.set(c,[]);grupos.get(c)!.push(p);}const cats=[...grupos.keys()].sort((a,b)=>a.localeCompare(b,'pt-BR'));const rows:any[]=[];for(const c of cats){rows.push([`=== ${c.toUpperCase()} ===`]);const itens=grupos.get(c)!.slice().sort((a,b)=>{const n=a.nome.localeCompare(b.nome,'pt-BR');return n!==0?n:a.codigo.localeCompare(b.codigo,'pt-BR');});for(const p of itens){rows.push([p.codigo,p.codigoBarras||'-',p.nome,p.marca||'-',p.compatibilidade||'',p.tamanho||'',p.genero||'',p.categoria.nome,p.precoVenda.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),String(p.quantidade),p.quantidade<=p.estoqueMinimo?'BAIXO':'OK']);}}const csv=[headers,...rows].map(r=>r.map((c:any)=>`"${c}"`).join(',')).join('\n');const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='estoque-marquinho.csv';a.click();URL.revokeObjectURL(url);}
  const formatMoney=(v:number)=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  // AJUSTE 6 — Exportar PDF (A4 landscape) — relatório de estoque da loja.
  // Client-side sobre dados já carregados pela página autenticada (sem endpoint público).
  function exportarPDF() {
    const data = listaRender;
    if (data.length === 0) { setMsg('Nenhum produto para exportar.'); return; }
    const grupos = new Map<string, Peca[]>();
    for (const p of data) {
      const c = p.categoria.nome || 'Sem categoria';
      if (!grupos.has(c)) grupos.set(c, []);
      grupos.get(c)!.push(p);
    }
    const cats = [...grupos.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const agora = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let htmlLinhas = '';
    for (const c of cats) {
      htmlLinhas += `<tr class="cat"><td colspan="11">${c.toUpperCase()}</td></tr>`;
      const itens = grupos.get(c)!.slice().sort((a, b) => {
        const n = a.nome.localeCompare(b.nome, 'pt-BR');
        return n !== 0 ? n : a.codigo.localeCompare(b.codigo, 'pt-BR');
      });
      for (const p of itens) {
        const qtdLoja = p.quantidadeLoja || 0;
        const status = qtdLoja <= p.estoqueMinimo ? 'BAIXO' : 'OK';
        htmlLinhas += `<tr class="${status === 'BAIXO' ? 'baixo' : ''}">
          <td class="mono">${p.codigo}</td>
          <td class="mono">${p.codigoBarras || ''}</td>
          <td>${p.nome}</td>
          <td>${p.marca || ''}</td>
          <td>${p.compatibilidade || ''}</td>
          <td>${p.tamanho || ''}</td>
          <td>${p.genero || ''}</td>
          <td>${p.categoria.nome}</td>
          <td class="num">${formatMoney(Number(p.precoVenda))}</td>
          <td class="num">${qtdLoja}</td>
          <td class="num">${status}</td>
        </tr>`;
      }
    }

    const filtroLinha = view === 'pecas' && categoriaSelecionada
      ? `<p class="filtro"><strong>Categoria:</strong> ${categoriaSelecionada.nome}${subcategoriaSelecionada ? ' · <strong>Subcategoria:</strong> ' + labelSubcategoria : ''}${buscaAtiva ? ' · <strong>Busca:</strong> ' + busca.trim() : ''}</p>`
      : buscaAtiva
        ? `<p class="filtro"><strong>Busca em todo o estoque da loja:</strong> ${busca.trim()}</p>`
        : '';

    const w = window.open('', '_blank', 'width=1200,height=700');
    if (!w) { setMsg('Nao foi possivel abrir a janela de impressao.'); return; }
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>RELATORIO DE ESTOQUE DA LOJA - ${DADOS_EMPRESA.fantasia}</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #222; margin: 0; padding: 0; }
        .header { text-align: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 3px double #111; }
        .fantasia { font-size: 20px; font-weight: 900; letter-spacing: -0.3px; color: #111; }
        .razao { font-size: 12px; font-weight: 700; color: #333; margin-top: 2px; }
        .emp { font-size: 10px; color: #555; margin-top: 1px; }
        h1 { text-align: center; font-size: 15px; margin: 10px 0 4px; }
        .meta { text-align: center; font-size: 10px; color: #555; margin-bottom: 10px; }
        .filtro { text-align: center; font-size: 11px; margin-bottom: 10px; color: #333; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; }
        th { background: #2563eb; color: #fff; font-size: 9px; text-align: left; }
        td.num { text-align: center; }
        tr.cat td { background: #e0e7ff; font-weight: 800; letter-spacing: 0.5px; }
        tr.baixo td { background: #fef3c7; }
        .mono { font-family: monospace; font-size: 9.5px; }
        button { margin-top: 12px; padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; }
        @media print { button { display: none; } }
      </style></head><body>
        <div class="header">
          <div class="fantasia">${DADOS_EMPRESA.fantasia}</div>
          <div class="razao">${DADOS_EMPRESA.razao}</div>
          <div class="emp">CNPJ: ${DADOS_EMPRESA.cnpj} · IE: ${DADOS_EMPRESA.ie}</div>
          <div class="emp">${DADOS_EMPRESA.endereco} — ${DADOS_EMPRESA.cidade}</div>
          <div class="emp">WHATSAPP: ${DADOS_EMPRESA.telefone1} · ${DADOS_EMPRESA.telefone2}</div>
        </div>
        <h1>RELATÓRIO DE ESTOQUE DA LOJA</h1>
        <p class="meta">Gerado em ${agora} · ${data.length} produtos</p>
        ${filtroLinha}
        <table>
          <thead><tr>
            <th>SKU</th><th>Cod.Barras</th><th>Peca</th><th>Marca</th><th>Compatibilidade</th><th>Tamanho</th><th>Genero</th><th>Categoria</th><th>Preco Venda</th><th>Qtd Loja</th><th>Status</th>
          </tr></thead>
          <tbody>${htmlLinhas}</tbody>
        </table>
        <button onclick="window.print()">Imprimir / Salvar como PDF</button>
      </body></html>`);
    w.document.close();
  }
  // Carrinho lateral — estado em React sincronizado com sessionStorage('pdv_preload'),
  // a mesma ponte usada pelo fluxo de venda existente (Estoque → PDV).
  const [carrinho, setCarrinho] = useState<CarrinhoLateralItem[]>([]);
  const [carrinhoOpen, setCarrinhoOpen] = useState(false);

  function carregarCarrinho() {
    try {
      const d = sessionStorage.getItem('pdv_preload');
      const arr = d ? JSON.parse(d) : [];
      setCarrinho(Array.isArray(arr) ? arr : []);
    } catch { setCarrinho([]); }
  }
  useEffect(() => { carregarCarrinho(); window.addEventListener('focus', carregarCarrinho); return () => window.removeEventListener('focus', carregarCarrinho); }, []);

  function salvarCarrinho(novo: CarrinhoLateralItem[]) {
    setCarrinho(novo);
    try { sessionStorage.setItem('pdv_preload', JSON.stringify(novo)); } catch { /* sessionStorage indisponivel */ }
  }

  function adicionarAoCarrinho(peca: Peca) {
    let novo: CarrinhoLateralItem[];
    try {
      const raw = sessionStorage.getItem('pdv_preload');
      const arr = raw ? JSON.parse(raw) : [];
      const lista = Array.isArray(arr) ? arr : [];
      const existente = lista.find((i: any) => i.pecaId === peca.id);
      if (existente) { existente.quantidade = (existente.quantidade || 1) + 1; }
      else { lista.push({ pecaId: peca.id, nome: peca.nome, codigo: peca.codigo, imagemUrl: null, precoVenda: Number(peca.precoVenda), quantidade: 1 }); }
      novo = lista;
    } catch { novo = [...carrinho]; const e = novo.find(i => i.pecaId === peca.id); if (e) e.quantidade += 1; else novo.push({ pecaId: peca.id, nome: peca.nome, codigo: peca.codigo, imagemUrl: null, precoVenda: Number(peca.precoVenda), quantidade: 1 }); }
    salvarCarrinho(novo);
    setCarrinhoOpen(true);
  }

  function alterarQuantidade(pecaId: string, delta: number) {
    const novo = carrinho.map(i => {
      if (i.pecaId !== pecaId) return i;
      const q = Math.max(1, (i.quantidade || 1) + delta);
      return { ...i, quantidade: q };
    });
    salvarCarrinho(novo);
  }

  function removerDoCarrinho(pecaId: string) {
    const novo = carrinho.filter(i => i.pecaId !== pecaId);
    salvarCarrinho(novo);
  }

  function finalizarVendaCarrinho() {
    // Fluxo de venda existente: o PDV consome sessionStorage('pdv_preload') no mount.
    window.location.href = '/balcao/pdv';
  }

  function venderPeca(peca: Peca) {
    try {
      const raw = sessionStorage.getItem('pdv_preload');
      const arr = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(arr)) { sessionStorage.setItem('pdv_preload', JSON.stringify([{ pecaId: peca.id, nome: peca.nome, codigo: peca.codigo, imagemUrl: null, precoVenda: Number(peca.precoVenda), quantidade: 1 }])); }
      else {
        const existente = arr.find((i: any) => i.pecaId === peca.id);
        if (existente) { existente.quantidade = (existente.quantidade || 1) + 1; }
        else { arr.push({ pecaId: peca.id, nome: peca.nome, codigo: peca.codigo, imagemUrl: null, precoVenda: Number(peca.precoVenda), quantidade: 1 }); }
        sessionStorage.setItem('pdv_preload', JSON.stringify(arr));
      }
    } catch { /* sessionStorage indisponivel */ }
    window.location.href = '/balcao/pdv';
  }

  return (
    <div className="p-6 flex flex-col h-full md:flex-row md:gap-6">
      <div className="flex-1 flex flex-col min-w-0">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
            <button onClick={irParaCategorias} className="hover:text-brand-600 transition-colors font-medium">Estoque</button>
            {categoriaSelecionada&&(<><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg><button onClick={()=>{setSubcategoriaSelecionada(null);setView('subcategorias');setBusca('');}} className="hover:text-brand-600 transition-colors font-medium">{categoriaSelecionada.nome}</button></>)}
            {subcategoriaSelecionada&&(<><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg><span className="text-slate-600 font-medium">{labelSubcategoria}</span></>)}
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">{buscaAtiva?(view==='pecas'?'RESULTADOS DA BUSCA':'BUSCA NO ESTOQUE DA LOJA'):view==='categorias'?'ESTOQUE DE PECAS':view==='subcategorias'?categoriaSelecionada?.nome.toUpperCase():labelSubcategoria?.toUpperCase()}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-5 text-xs"><div className="text-center"><p className="text-slate-400">Total</p><p className="text-sm font-bold text-slate-800">{totalPecas}</p></div><div className="w-px h-8 bg-slate-200 hidden sm:block"/><div className="text-center"><p className="text-slate-400">Baixo</p><p className={`text-sm font-bold ${estoqueBaixo>0?'text-amber-600':'text-emerald-600'}`}>{estoqueBaixo}</p></div></div>
          <div className="flex items-center gap-2"><button onClick={exportarCSV} className="btn-secondary inline-flex items-center gap-2 text-xs"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>Exportar CSV</button><button onClick={exportarPDF} className="btn-secondary inline-flex items-center gap-2 text-xs"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2zm3-4h4m-4-4h4"/></svg>Exportar PDF</button><button onClick={()=>abrirForm()} className="btn-primary inline-flex items-center gap-2 text-xs"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>Nova peca</button>{carrinho.length > 0 && <button onClick={() => setCarrinhoOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-300">CARRINHO ({carrinho.reduce((s,i)=>s+i.quantidade,0)})</button>}</div>
        </div>
      </div>
      <div className="mb-5 flex-shrink-0"><div className="relative max-w-md"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar peca, SKU, codigo de barras, marca ou compatibilidade..." className="input-field pl-10"/></div></div>
      {loading?<div className="flex-1 flex items-center justify-center"><p className="text-sm text-slate-400">Carregando...</p></div>:(
        <div className="flex-1 overflow-auto">
          {!buscaAtiva&&view==='categorias'&&(<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{categoriasComContagem.map(cat=>(<button key={cat.id} onClick={()=>selecionarCategoria(cat)} className="card flex flex-col items-center justify-center text-center p-7 hover:border-brand-300 hover:shadow-md transition-all group cursor-pointer min-h-[160px]"><div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 group-hover:scale-105 duration-200 transition-all">{iconeCategoria(cat.slug)}</div><h3 className="text-sm font-semibold text-slate-800 mb-1">{cat.nome}</h3><p className="text-xs text-slate-400">{cat._count.pecas} pecas</p></button>))}</div>)}
          {!buscaAtiva&&view==='subcategorias'&&(<div><button onClick={voltarNivel} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 mb-4 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>Voltar para categorias</button><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{subcategorias.map(sub=>{const s=subcategoriasContagem.get(sub)||{count:0,baixas:0};const count=s.count;const baixas=s.baixas;return(<button key={sub} onClick={()=>selecionarSubcategoria(sub)} className="card p-5 hover:border-brand-300 hover:shadow-md transition-all group cursor-pointer text-left"><div className="flex items-start justify-between mb-3"><div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 group-hover:scale-105 duration-200 transition-all"><svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>{baixas>0&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">{baixas} baixo</span>}</div><h3 className="text-sm font-semibold text-slate-800 mb-1">{sub}</h3><p className="text-xs text-slate-400">{count} pecas</p></button>);})}{temSemSubcategoria&&(()=>{const s=subcategoriasContagem.get(NO_SUBCAT)||{count:0,baixas:0};const count=s.count;const baixas=s.baixas;return(<button key={NO_SUBCAT} onClick={()=>selecionarSubcategoria(NO_SUBCAT)} className="card p-5 hover:border-brand-300 hover:shadow-md transition-all group cursor-pointer text-left border-dashed border-slate-300"><div className="flex items-start justify-between mb-3"><div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 group-hover:scale-105 duration-200 transition-all"><svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>{baixas>0&&<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">{baixas} baixo</span>}</div><h3 className="text-sm font-semibold text-slate-800 mb-1">{LABEL_SEM_SUBCATEGORIA}</h3><p className="text-xs text-slate-400">{count} pecas</p></button>);})()}</div></div>)}
          {(view==='pecas'||buscaAtiva)&&(<div className="h-full flex flex-col min-h-0">{view==='pecas'?(<button onClick={voltarNivel} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 mb-4 transition-colors"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>Voltar para {categoriaSelecionada?.nome}</button>):(<div className="flex flex-wrap items-center justify-between gap-2 mb-4"><p className="text-xs text-slate-500"><span className="font-semibold text-slate-700">{listaRender.length}</span> {listaRender.length===1?'resultado':'resultados'} para <span className="font-semibold text-brand-700">&quot;{busca.trim()}&quot;</span> em todo o estoque da loja{totalLojaFiltrado>0?<> · <span className="font-semibold text-slate-700">{totalLojaFiltrado}</span> em estoque</>:null}</p><button onClick={()=>setBusca('')} className="text-xs text-slate-500 hover:text-brand-600 transition-colors font-medium">Limpar busca</button></div>)}{listaRender.length===0?(<div className="card text-center py-16"><p className="text-sm text-slate-400">Nenhuma peca encontrada{buscaAtiva?<> para &quot;{busca.trim()}&quot;</>:null}.</p></div>):(<div className="card-table flex-1 flex flex-col min-h-0"><div className="flex-1 overflow-auto min-h-0"><table className="w-full text-sm min-w-[980px]"><thead><tr className="border-b border-slate-100 bg-slate-50/60"><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cod. Barras</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Peca</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Marca</th>{view!=='pecas'&&<th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoria</th>}<th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Compativel</th><th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Preco</th><th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Loja</th><th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Central</th><th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th><th className="sticky right-0 z-10 bg-slate-100 text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acoes</th></tr></thead><tbody>{listaRender.map((p,i)=>{const qtdLoja=p.quantidadeLoja||0;const linhaZebrada=i%2===0?'bg-white':'bg-slate-50';const corAcoes=qtdLoja<=p.estoqueMinimo?'bg-amber-50':linhaZebrada;return(<tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-100/70 transition-colors ${linhaZebrada} ${qtdLoja<=p.estoqueMinimo?'bg-amber-50/30':''}`}><td className="py-3 px-4 font-mono text-xs text-slate-500">{p.codigo}</td><td className="py-3 px-4 font-mono text-xs text-slate-400">{p.codigoBarras||'—'}</td><td className="py-3 px-4"><p className="font-medium text-slate-800">{p.nome}</p></td><td className="py-3 px-4 text-xs text-slate-500">{p.marca||'-'}</td>{view!=='pecas'&&<td className="py-3 px-4 text-xs text-slate-500">{p.categoria?.nome||'-'}{p.subcategoria?<span className="text-slate-400"> · {p.subcategoria}</span>:null}</td>}<td className="py-3 px-4 text-xs text-slate-500 max-w-[120px] truncate">{p.compatibilidade||'-'}</td><td className="py-3 px-4 text-xs font-medium text-slate-700">{formatMoney(Number(p.precoVenda))}</td><td className="py-3 px-4 text-center"><span className={`inline-flex items-center justify-center min-w-[44px] px-2.5 py-1 rounded text-xs font-bold ${qtdLoja<=p.estoqueMinimo?'bg-amber-100 text-amber-700':'bg-slate-100 text-slate-700'}`}>{qtdLoja}</span></td><td className="py-3 px-4 text-center"><span className="text-xs text-slate-500">{p.quantidadeCentral||'-'}</span></td><td className="py-3 px-4 text-center"><span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${qtdLoja<=p.estoqueMinimo?'bg-amber-50 text-amber-700':'bg-emerald-50 text-emerald-700'}`}><span className={`w-1.5 h-1.5 rounded-full ${qtdLoja<=p.estoqueMinimo?'bg-amber-500':'bg-emerald-500'}`}/>{qtdLoja<=p.estoqueMinimo?'Baixo':'OK'}</span></td><td className={`sticky right-0 z-10 ${corAcoes} py-3 px-4 text-right`}><button onClick={()=>{adicionarAoCarrinho(p);setCarrinhoOpen(true);}} className="text-xs text-blue-600 hover:text-blue-700 font-medium mr-3" title="Adicionar ao carrinho">+ Carrinho</button><button onClick={()=>venderPeca(p)} className="text-xs text-emerald-600 hover:text-emerald-700 font-bold mr-3" title="Vender no PDV">VENDER</button></td></tr>);})}</tbody></table></div></div>)}</div>)}
        </div>
      )}
      {modal.open&&(<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"><h2 className="text-base font-bold text-slate-800 mb-5">{modal.peca?'Editar peca':'Nova peca'}</h2>{msg&&<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs mb-4">{msg}</div>}<div className="grid grid-cols-2 gap-4"><div className="col-span-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Nome</label><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} className="input-field mt-1.5"/></div><div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</label><input value={form.codigo} onChange={e=>setForm({...form,codigo:e.target.value})} className="input-field mt-1.5"/></div><div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Subcategoria</label><select value={form.subcategoria} onChange={e=>setForm({...form,subcategoria:e.target.value})} className="input-field mt-1.5"><option value="">{LABEL_SEM_SUBCATEGORIA}</option>{subcategorias.map(s=>(<option key={s} value={s}>{s}</option>))}</select></div><div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Marca</label><input value={form.marca} onChange={e=>setForm({...form,marca:e.target.value})} className="input-field mt-1.5" placeholder="ProTork, NGK..."/></div><div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Compatibilidade</label><input value={form.compatibilidade} onChange={e=>setForm({...form,compatibilidade:e.target.value})} className="input-field mt-1.5" placeholder="Ex: CG 125 2000-2008"/></div><div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Categoria</label><select value={form.categoriaId} onChange={e=>setForm({...form,categoriaId:e.target.value})} className="input-field mt-1.5"><option value="">Selecionar</option>{categorias.map(c=>(<option key={c.id} value={c.id}>{c.nome}</option>))}</select></div><div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Descricao</label><input value={form.descricao} onChange={e=>setForm({...form,descricao:e.target.value})} className="input-field mt-1.5"/></div>{modal.peca&&(<div className="col-span-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600"><span className="font-semibold">Preços (somente DONA/ESTOQUE alteram):</span> venda {formatMoney(Number(modal.peca.precoVenda))} · custo {formatMoney(Number(modal.peca.precoCusto))}</div>)}<div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Quantidade</label><input type="number" value={form.quantidade} onChange={e=>setForm({...form,quantidade:e.target.value})} className="input-field mt-1.5"/></div><div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Estoque minimo</label><input type="number" value={form.estoqueMinimo} onChange={e=>setForm({...form,estoqueMinimo:e.target.value})} className="input-field mt-1.5"/></div></div><div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100"><button onClick={()=>setModal({open:false})} className="btn-secondary text-xs">Cancelar</button><button onClick={salvar} className="btn-primary text-xs">Salvar</button></div></div></div>)}
      </div>{/* /flex-1 conteúdo principal */}
      {carrinhoOpen && (<>
        <div className="fixed inset-0 bg-black/20 z-30 md:hidden" onClick={() => setCarrinhoOpen(false)} />
        <CarrinhoLateral
          itens={carrinho}
          onClose={() => setCarrinhoOpen(false)}
          onQuantidade={alterarQuantidade}
          onRemover={removerDoCarrinho}
          onFinalizar={finalizarVendaCarrinho}
        />
      </>)}
    </div>
  );
}
