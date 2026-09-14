'use client';

// ============================================================================
// MÓDULO ÚNICO DE IMPRESSÃO — NOTAS DO CLIENTE / NOTA DE SERVIÇO (A4 interna)
// ============================================================================
// Usado por:
//  - DONA:  /dono/notas (Central de Notas), /dono/ordens (DetalheOS)
//  - BALCÃO: DetalheOSBalcao (Nota do Cliente da OS) e PDV (Nota de Venda)
//  - NF MANUAL: /dono/nf-manual
// ----------------------------------------------------------------------------
// 4 categorias de documento:
//   A) DOCUMENTO INTERNO DO MECÂNICO  → checklist térmico (fora deste módulo)
//   B) NOTA DO CLIENTE — OS           → imprimirNotaServico()
//   C) NOTA DO CLIENTE — VENDA/PDV    → imprimirNotaVenda()
//   D) NF MANUAL                      → imprimirNfManual()
// B/C/D compartilham o MESMO cabeçalho, CSS, dados da empresa, formatação de
// moeda e rodapé. Não há cópias duplicadas de HTML.
// ----------------------------------------------------------------------------
// SEM integração SEFAZ: documento interno, sem autorização fiscal, sem chave
// de acesso inventada, sem QR Code fiscal. Reimpressão NUNCA altera
// NotaFiscal.dataServico.
// ============================================================================

export const DADOS_EMPRESA = {
  fantasia: 'MARQUINHO MOTO PEÇAS',
  razao: 'MARCOS BRITO MOUZINHO EXPRESSO',
  cnpj: '24.585.668/0001-06',
  ie: '066967163',
  endereco: 'ESTRADA DE ÁGUAS COMPRIDAS, 630 — ÁGUAS COMPRIDAS',
  cidade: 'OLINDA - PE',
  telefone1: '(81) 9814-3879',
  telefone2: '(81) 8706-9882',
} as const;

// CSS único das Notas do Cliente (OS + Venda) e NF Manual
export const CSS_NOTA_CLIENTE = `
  *{margin:0;padding:0;box-sizing:border-box}body{font-family:"DejaVu Sans",Arial,Helvetica,sans-serif;font-size:13px;color:#222;padding:40px;line-height:1.5}
  .header{text-align:center;margin-bottom:22px;padding-bottom:16px;border-bottom:3px double #111}
  .fantasia{font-size:24px;font-weight:900;letter-spacing:-0.5px;color:#111}
  .razao{font-size:13px;font-weight:700;color:#333;margin-top:2px}
  .empresa-linha{font-size:12.5px;color:#333;font-weight:600;margin-top:2px;line-height:1.65}
  .doc-titulo{display:inline-block;margin-top:12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;background:#f2f2f2;border:1px solid #ccc;border-radius:4px;padding:3px 14px;color:#333}
  .info{display:flex;justify-content:space-between;flex-wrap:wrap;margin-bottom:16px;padding:12px 16px;background:#f8f8f8;border-radius:8px;gap:6px 16px}
  .info div{font-size:12px}.info span{font-weight:700;color:#444}
  .section-title{font-size:13px;font-weight:800;margin:18px 0 8px;color:#333;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #ddd;padding-bottom:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  th{background:#f2f2f2;padding:8px;text-align:left;font-size:10.5px;text-transform:uppercase;letter-spacing:0.4px;border-bottom:2px solid #ccc;color:#444}
  td{padding:6px 8px;border-bottom:1px solid #eee;font-size:12px;color:#333;vertical-align:top}
  .center{text-align:center}.right{text-align:right}
  .totais{width:300px;margin-left:auto}.totais table td{padding:5px 8px;border:none}.totais tr.total td{font-size:15px;font-weight:700;border-top:2px solid #333;padding-top:8px}
  .footer{text-align:center;margin-top:30px;font-size:10px;color:#888;line-height:1.6}
  .obs{font-size:10px;color:#999;margin-top:6px}
  @media print{body{padding:20px}.empresa-linha{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

function esc(s: string | null | undefined): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Rótulo do produto na nota: "NOME — MARCA" somente quando a marca real está
// cadastrada. Sem marca → apenas "NOME". Nunca "NOME —", "NOME — null",
// "NOME — undefined" ou "NOME — Sem marca".
function rotuloProduto(nome: string | null | undefined, marca: string | null | undefined): string {
  const n = (nome || '').trim();
  const m = (marca || '').trim();
  if (!n) return '';
  return m ? `${n} — ${m}` : n;
}

function fm(v: number | string | null | undefined): string {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtH(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '—';
  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// FORMATO ÚNICO DE DATA + HORA DE TODAS AS NOTAS (AJUSTE 2)
// ============================================================================
// Padrão: dd/MM/yyyy - HH:mm   (ex.: 05/09/2026 - 00:02)
// Nenhuma nota pode sair só com a data quando existir horário armazenado.
// Se o registro histórico só tiver data (sem hora real), imprime apenas a data
// — NUNCA inventa um horário. Um Date do Prisma sempre carrega hora; o caso
// "só data" só acontece quando o objeto não existe ou é inválido.
export function fmtDataHora(d?: string | Date | null): string {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(dt.getTime())) return '—';
  const data = dt.toLocaleDateString('pt-BR');
  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  // Hora ausente/zerada no objeto (ex.: string "2026-09-05" → 00:00 local)
  // não é tratada como horário real: nesse caso sai só a data.
  const somenteData = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.trim());
  return somenteData ? data : `${data} - ${hora}`;
}

function headerHtml(titulo: string): string {
  return `<div class="header">
    <div class="fantasia">${DADOS_EMPRESA.fantasia}</div>
    <div class="razao">${DADOS_EMPRESA.razao}</div>
    <div class="empresa-linha">CNPJ: ${DADOS_EMPRESA.cnpj}</div>
    <div class="empresa-linha">IE: ${DADOS_EMPRESA.ie}</div>
    <div class="empresa-linha">${DADOS_EMPRESA.endereco}</div>
    <div class="empresa-linha">${DADOS_EMPRESA.cidade}</div>
    <div class="empresa-linha">WHATSAPP: ${DADOS_EMPRESA.telefone1} · ${DADOS_EMPRESA.telefone2}</div>
    <div class="doc-titulo">${titulo}</div>
  </div>`;
}

// ============================================================================
// CABEÇALHO OFICIAL COMPACTO (documentos TÉRMICOS 72mm / 280px)
// ============================================================================
// Usado na Nota Mecânico (checklist) e na Nota de Venda Térmica do PDV.
// Mesma fonte única de DADOS_EMPRESA dos documentos A4 — substitui os antigos
// cabeçalhos manuais "MARQUINHO / Moto Pecas / Atacado & Varejo" que ainda
// existiam em alguns componentes. O parâmetro opcional `titulo` é renderizado
// abaixo dos dados da empresa (ex.: "NOTA MECÂNICO", "VENDA #1234").
export function headerEmpresaCompacto(titulo?: string): string {
  return `<div class="center">
    <div class="logo">${DADOS_EMPRESA.fantasia}</div>
    <div class="ofic">${DADOS_EMPRESA.razao}</div>
    <div class="emp">CNPJ: ${DADOS_EMPRESA.cnpj}</div>
    <div class="emp">IE: ${DADOS_EMPRESA.ie}</div>
    <div class="emp">${DADOS_EMPRESA.endereco}</div>
    <div class="emp">${DADOS_EMPRESA.cidade}</div>
    <div class="emp">WHATSAPP: ${DADOS_EMPRESA.telefone1} · ${DADOS_EMPRESA.telefone2}</div>
    ${titulo ? `<div class="doc-titulo-term">${titulo}</div>` : ''}
  </div>`;
}

function footerHtml(extra?: string): string {
  return `<div class="footer">${extra ? extra + '<br>' : ''}Marquinho Moto Peças — Obrigado pela preferência!<br>Documento interno — sem integração SEFAZ</div>`;
}

function abrirJanela(titulo: string): Window | null {
  const w = window.open('', '_blank', 'width=800,height=900');
  if (!w) return null;
  return w;
}

// ============================================================================
// B) NOTA DO CLIENTE — ORDEM DE SERVIÇO
// ============================================================================
export interface ItemNotaServico {
  id?: string;
  peca?: { codigo?: string | null; nome?: string; marca?: string | null } | null;
  quantidade: number;
  precoUnitario: number;
  adaptado?: boolean;
}

export interface ServicoNotaServico {
  id?: string;
  nome?: string;
  valor?: number | string;
}

export interface NotaFiscalInfo {
  id?: string;
  numero?: string;
  chaveAcesso?: string | null;
  dataServico?: string | null;
  emitidaEm?: string;
}

export interface OsParaImprimir {
  id?: string;
  numero?: number;
  nomeCliente?: string;
  telefoneCliente?: string;
  modeloMoto?: string;
  placaMoto?: string;
  anoMoto?: string;
  descricaoProblema?: string;
  diagnostico?: string;
  tipoServico?: string;
  status?: string;
  valorTotal?: number;
  valorMaoDeObra?: number;
  desconto?: number;
  formaPagamento?: string | null;
  pagamentos?: PagamentoNotaVenda[];
  mecanico?: { name?: string } | null;
  itens?: ItemNotaServico[];
  servicos?: ServicoNotaServico[] | null;
  notaFiscal?: NotaFiscalInfo | null;
  inicioServico?: string | null;
  fimServico?: string | null;
}

// Traduz a forma de pagamento armazenada como string (ex: "DINHEIRO, PIX") em
// nomes amigáveis. Usa o mesmo TIPO_LABEL da Nota de Venda (fonte única).
function traduzirFormas(str?: string | null): string {
  if (!str) return '';
  return str
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => TIPO_LABEL[s] || s)
    .join(', ');
}

export function imprimirNotaServico(os: OsParaImprimir): void {
  const w = abrirJanela('Nota de Serviço');
  if (!w) return;

  // Data do Serviço: usa dataServico persistida. Notas antigas sem dataServico usam emitidaEm como fallback.
  const dataServicoRaw = os.notaFiscal?.dataServico
    ? os.notaFiscal.dataServico
    : os.notaFiscal?.emitidaEm
      ? os.notaFiscal.emitidaEm
      : new Date();
  // AJUSTE 2: data + horário do serviço no formato único dd/MM/yyyy - HH:mm.
  // Fonte: NotaFiscal.dataServico (preservado na reimpressão); fallback emitidaEm.
  const dataServicoStr = fmtDataHora(dataServicoRaw);
  const impressoEm = new Date().toLocaleString('pt-BR');

  const servicosReg = os.servicos && os.servicos.length > 0 ? os.servicos : null;
  const servicosTxt = os.tipoServico ? os.tipoServico.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const maoDeObra = Number(os.valorMaoDeObra) || 0;
  const totalPecas = (os.itens || []).reduce((s, i) => s + Number(i.precoUnitario) * Number(i.quantidade || 0), 0);
  const desconto = Number(os.desconto) || 0;
  const total = Number(os.valorTotal) || 0;

  const linhasItens = (os.itens || []).map((i) =>
    `<tr><td>${esc(i.peca?.codigo || '')}</td><td>${esc(rotuloProduto(i.peca?.nome, i.peca?.marca))}</td><td class="center">${i.quantidade}</td><td class="right">${fm(i.precoUnitario)}</td><td class="right">${fm(Number(i.precoUnitario) * Number(i.quantidade || 0))}</td></tr>`
  ).join('');

  const linhasServicos = servicosReg
    ? servicosReg.map((s) => `<tr><td>${esc(s.nome)}</td><td class="right">${fm(s.valor)}</td></tr>`).join('')
    : servicosTxt.map((s) => `<tr><td>${esc(s)}</td><td class="right">—</td></tr>`).join('');
  const servicosHtml = linhasServicos || '<tr><td colspan="2" style="text-align:center;color:#999">Nenhum serviço registrado</td></tr>';

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>NF ${esc(os.notaFiscal?.numero || os.numero?.toString() || '')}</title><style>
    ${CSS_NOTA_CLIENTE}
  </style></head><body>
    ${headerHtml('Nota de Serviço / Comprovante')}
    <div class="info">
      <div><span>NF:</span> ${esc(os.notaFiscal?.numero || '')}</div>
      <div><span>OS:</span> #${esc(os.numero?.toString() || '')}</div>
      <div><span>Data do Serviço:</span> ${dataServicoStr}</div>
      ${os.notaFiscal?.chaveAcesso ? `<div><span>Chave:</span> ${esc(os.notaFiscal.chaveAcesso)}</div>` : ''}
      <div style="width:100%;margin-top:4px;font-size:10px;color:#999"><span>Impresso em:</span> ${impressoEm}</div>
    </div>
    <div class="section-title">Dados do Cliente</div>
    <div class="info">
      <div><span>Cliente:</span> ${esc(os.nomeCliente)}</div>
      <div><span>Telefone:</span> ${esc(os.telefoneCliente)}</div>
      <div><span>Mecânico:</span> ${esc(os.mecanico?.name || '—')}</div>
    </div>
    <div class="section-title">Veículo</div>
    <div class="info">
      <div><span>Moto:</span> ${esc(os.modeloMoto)}</div>
      <div><span>Placa:</span> ${esc(os.placaMoto || '—')}</div>
      <div><span>Ano:</span> ${esc(os.anoMoto || '—')}</div>
    </div>
    <div class="section-title">Início e Término do Serviço</div>
    <div class="info">
      <div><span>Início:</span> ${fmtH(os.inicioServico)}</div>
      <div><span>Término:</span> ${fmtH(os.fimServico)}</div>
    </div>
    <div class="section-title">Serviços Realizados</div>
    <table><thead><tr><th>Serviço</th><th class="right">Valor</th></tr></thead><tbody>${servicosHtml}${maoDeObra > 0 ? `<tr><td>Mão de obra</td><td class="right">${fm(maoDeObra)}</td></tr>` : ''}</tbody></table>
    <div class="section-title">Peças Utilizadas</div>
    <table><thead><tr><th>SKU</th><th>Descrição</th><th class="center">Qtd</th><th class="right">V. Unit.</th><th class="right">Total</th></tr></thead><tbody>${linhasItens || '<tr><td colspan="5" style="text-align:center;color:#999">Nenhum item</td></tr>'}</tbody></table>
    <div class="totais"><table>
      <tr><td class="right">Peças</td><td class="right">${fm(totalPecas)}</td></tr>
      <tr><td class="right">Mão de obra / Serviços</td><td class="right">${fm(maoDeObra)}</td></tr>
      ${desconto > 0 ? `<tr><td class="right">Desconto</td><td class="right">− ${fm(desconto)}</td></tr>` : ''}
      <tr class="total"><td class="right">TOTAL</td><td class="right">${fm(total)}</td></tr>
      ${os.pagamentos && os.pagamentos.length > 0
        ? os.pagamentos.map(p => `<tr><td class="right">${TIPO_LABEL[p.tipo] || esc(p.tipo)}</td><td class="right">${fm(p.valor)}</td></tr>`).join('')
        : os.formaPagamento
          ? `<tr><td class="right">Forma de Pagamento</td><td class="right">${esc(traduzirFormas(os.formaPagamento))}</td></tr>`
          : ''}
    </table></div>
    ${footerHtml()}
    <script>setTimeout(function(){window.print();},300);</script>
  </body></html>`);
  w.document.close();
}

// ============================================================================
// C) NOTA DO CLIENTE — VENDA / PDV
// ============================================================================
export interface ItemNotaVenda {
  nome: string;
  codigo: string;
  marca?: string | null;
  quantidade: number;
  precoUnitario: number;
  subtotal: number;
}

export interface PagamentoNotaVenda {
  tipo: string;
  valor: number;
  troco: number;
  bandeira?: string;
  parcelas?: number;
}

export interface VendaParaImprimir {
  numero: number;
  notaNumero?: string;
  clienteNome?: string | null;
  clienteTelefone?: string | null;
  clienteCpf?: string | null;
  subtotal: number;
  descontoTotal: number;
  total: number;
  createdAt: string;
  itens: ItemNotaVenda[];
  pagamentos: PagamentoNotaVenda[];
}

// ============================================================================
// C.1) NORMALIZAÇÃO ÚNICA — VENDA → VendaParaImprimir
// ============================================================================
// Aceita os DOIS shapes que o sistema produz e devolve EXATAMENTE o mesmo
// objeto para imprimirNotaVenda():
//   A) resposta do POST /api/vendas (venda "flat"):
//        itens[].peca.{nome,codigo,imagemUrl,marca} · itens[].precoVendido
//        pagamentos[].{tipo,valor,troco,bandeira,parcelas}
//        notaFiscal?: { numero?: string }  (preenchido no fluxo PDV/Venda Avulsa)
//   B) venda carregada via GET /api/notas (n.venda aninhado na Nota):
//        itens[].peca.{nome,codigo} · itens[].precoVendido
//        pagamentos[].{tipo,valor,troco,bandeira,parcelas}
//        notaNumero = n.numero (NF V-XXXX) repassado pelo caller.
// Regra: nenhum call-site deve re-mapear itens/pagamentos à mão. A fonte de
// verdade é única (aqui), garantindo impressão e reimpressão idênticas.
export function normalizarVendaParaImpressao(venda: any, notaNumero?: string): VendaParaImprimir {
  const itens = (venda?.itens || []).map((i: any): ItemNotaVenda => {
    const precoUnit =
      Number.isFinite(Number(i.precoUnitario)) && Number(i.precoUnitario) !== 0
        ? Number(i.precoUnitario)
        : Number(i.precoVendido) || 0;
    return {
      nome: i.nome || i.peca?.nome || '—',
      codigo: i.codigo || i.peca?.codigo || '',
      marca: i.marca ?? i.peca?.marca ?? null,
      quantidade: Number(i.quantidade) || 0,
      precoUnitario: precoUnit,
      subtotal: Number(i.subtotal) || 0,
    };
  });

  const pagamentos = (venda?.pagamentos || []).map((p: any): PagamentoNotaVenda => ({
    tipo: p.tipo,
    valor: Number(p.valor) || 0,
    troco: Number(p.troco) || 0,
    bandeira: p.bandeira || undefined,
    parcelas: p.parcelas || undefined,
  }));

  return {
    numero: Number(venda.numero),
    notaNumero: notaNumero || venda.notaFiscal?.numero || undefined,
    clienteNome: venda.clienteNome,
    clienteTelefone: venda.clienteTelefone,
    clienteCpf: venda.clienteCpf,
    subtotal: Number(venda.subtotal) || 0,
    descontoTotal: Number(venda.descontoTotal) || 0,
    total: Number(venda.total) || 0,
    createdAt: venda.createdAt,
    itens,
    pagamentos,
  };
}

const TIPO_LABEL: Record<string, string> = {
  DINHEIRO: 'Dinheiro', PIX: 'PIX', CARTAO_DEBITO: 'Débito', CARTAO_CREDITO: 'Crédito',
};

export function imprimirNotaVenda(venda: VendaParaImprimir): void {
  const w = abrirJanela('Nota de Venda');
  if (!w) return;

  // AJUSTE 2: data + horário no formato único dd/MM/yyyy - HH:mm. Fonte: Venda.createdAt.
  const dataHoraStr = fmtDataHora(venda.createdAt);
  const impressoEm = new Date().toLocaleString('pt-BR');

  const linhasItens = venda.itens.map((i) =>
    `<tr><td>${esc(i.codigo)}</td><td>${esc(rotuloProduto(i.nome, i.marca))}</td><td class="center">${i.quantidade}</td><td class="right">${fm(i.precoUnitario)}</td><td class="right">${fm(i.subtotal)}</td></tr>`
  ).join('');

  const linhasPg = venda.pagamentos.map((p) => {
    const trocoTexto = p.troco > 0 ? ` (Troco: ${fm(p.troco)})` : '';
    return `<tr><td colspan="3">${TIPO_LABEL[p.tipo] || esc(p.tipo)}${p.bandeira ? ' - ' + esc(p.bandeira) : ''}${p.parcelas ? ' ' + p.parcelas + 'x' : ''}${trocoTexto}</td><td class="right">${fm(p.valor)}</td></tr>`;
  }).join('');

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Venda #${venda.numero}</title><style>
    ${CSS_NOTA_CLIENTE}
  </style></head><body>
    ${headerHtml('Nota de Venda / Comprovante')}
    <div class="info">
      ${venda.notaNumero ? `<div><span>Nota:</span> ${esc(venda.notaNumero)}</div>` : ''}
      <div><span>Venda:</span> #${venda.numero}</div>
      <div><span>Data:</span> ${dataHoraStr}</div>
      ${venda.clienteNome ? `<div><span>Cliente:</span> ${esc(venda.clienteNome)}</div>` : ''}
      ${venda.clienteTelefone ? `<div><span>Telefone:</span> ${esc(venda.clienteTelefone)}</div>` : ''}
      ${venda.clienteCpf ? `<div><span>CPF/CNPJ:</span> ${esc(venda.clienteCpf)}</div>` : ''}
      <div style="width:100%;margin-top:4px;font-size:10px;color:#999"><span>Impresso em:</span> ${impressoEm}</div>
    </div>
    <div class="section-title">Produtos</div>
    <table><thead><tr><th>SKU</th><th>Descrição</th><th class="center">Qtd</th><th class="right">V. Unit.</th><th class="right">Subtotal</th></tr></thead><tbody>${linhasItens || '<tr><td colspan="5" style="text-align:center;color:#999">Nenhum item</td></tr>'}</tbody></table>
    <div class="totais"><table>
      <tr><td class="right">Subtotal</td><td class="right">${fm(venda.subtotal)}</td></tr>
      ${venda.descontoTotal > 0 ? `<tr><td class="right">Desconto</td><td class="right">− ${fm(venda.descontoTotal)}</td></tr>` : ''}
      <tr class="total"><td class="right">TOTAL</td><td class="right">${fm(venda.total)}</td></tr>
    </table></div>
    ${venda.pagamentos.length > 0 ? `<div class="section-title">Pagamento</div><table><thead><tr><th colspan="3">Forma</th><th class="right">Valor</th></tr></thead><tbody>${linhasPg}</tbody></table>` : ''}
    ${footerHtml()}
    <script>setTimeout(function(){window.print();},300);</script>
  </body></html>`);
  w.document.close();
}

// ============================================================================
// D) NF MANUAL (mesma identidade visual)
// ============================================================================
export interface NfManualParaImprimir {
  numero: number | string;
  cliente?: string;
  cpfCnpj?: string;
  endereco?: string;
  observacoes?: string;
  formaPagamento?: string;
  itens: { nome: string; codigo: string; marca?: string | null; quantidade: number; valorUnitario: number }[];
  total: number;
  /** BLOCO 7 — desconto fixo em R$ (opcional). Quando presente, a nota imprime
   *  SUBTOTAL / DESCONTO (−) / TOTAL em vez de apenas TOTAL. */
  desconto?: number;
  /** Subtotal (sem desconto). Usado pelo Bloco 7 para exibir a linha SUBTOTAL. */
  subtotal?: number;
  /** true (padrão) dispara window.print() automaticamente; false abre o mesmo
   *  documento com um botão "Imprimir / Salvar PDF" para o usuário controlar. */
  autoPrint?: boolean;
  /** AJUSTE 2 — data/hora de emissão do documento. A NF Manual é gerada na hora
   *  e não é persistida, então o caller informa o instante da geração (o mesmo
   *  usado em "Imprimir" e em "Gerar PDF"). Sem valor → agora. */
  dataEmissao?: string | Date;
}

export function imprimirNfManual(opts: NfManualParaImprimir): void {
  const w = abrirJanela('Nota Fiscal Manual');
  if (!w) return;
  // AJUSTE 2: data + horário do documento no formato único dd/MM/yyyy - HH:mm.
  // A NF Manual não é persistida — o horário é o do instante de emissão,
  // informado pelo caller (o mesmo em Imprimir e em Gerar PDF).
  const dataEmissaoStr = fmtDataHora(opts.dataEmissao ?? new Date());
  const impressoEm = new Date().toLocaleString('pt-BR');
  const autoPrint = opts.autoPrint !== false;

  const linhasItens = opts.itens.map((i) =>
    `<tr><td>${esc(i.codigo)}</td><td>${esc(rotuloProduto(i.nome, i.marca))}</td><td class="center">${i.quantidade}</td><td class="right">${fm(i.valorUnitario)}</td><td class="right">${fm(i.valorUnitario * i.quantidade)}</td></tr>`
  ).join('');

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>NF Manual ${esc(String(opts.numero))}</title><style>
    ${CSS_NOTA_CLIENTE}
    ${autoPrint ? '' : '.btn-print{position:fixed;top:12px;right:12px;z-index:99;background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 4px 12px rgba(37,99,235,.35)}@media print{.btn-print{display:none}}'}
  </style></head><body>
    ${autoPrint ? '' : '<button class="btn-print" onclick="window.print()">🖨 Imprimir / Salvar PDF</button>'}
    ${headerHtml('Nota Fiscal Manual')}
    <div class="info">
      <div><span>NF:</span> ${esc(String(opts.numero))}</div>
      <div><span>Data:</span> ${dataEmissaoStr}</div>
      ${opts.formaPagamento ? `<div><span>Pagamento:</span> ${esc(opts.formaPagamento)}</div>` : ''}
      <div style="width:100%;margin-top:4px;font-size:10px;color:#999"><span>Impresso em:</span> ${impressoEm}</div>
    </div>
    <div class="section-title">Dados do Cliente</div>
    <div class="info">
      <div><span>Cliente:</span> ${esc(opts.cliente) || '—'}</div>
      <div><span>CPF/CNPJ:</span> ${esc(opts.cpfCnpj) || '—'}</div>
      <div><span>Endereço:</span> ${esc(opts.endereco) || '—'}</div>
    </div>
    <div class="section-title">Produtos</div>
    <table><thead><tr><th>SKU</th><th>Descrição</th><th class="center">Qtd</th><th class="right">V. Unit.</th><th class="right">Total</th></tr></thead><tbody>${linhasItens || '<tr><td colspan="5" style="text-align:center;color:#999">Nenhum item</td></tr>'}</tbody></table>
    <div class="totais"><table>
      ${opts.subtotal != null ? `<tr><td class="right">Subtotal</td><td class="right">${fm(opts.subtotal)}</td></tr>` : ''}
      ${Number(opts.desconto) > 0 ? `<tr><td class="right">Desconto</td><td class="right">− ${fm(opts.desconto)}</td></tr>` : ''}
      <tr class="total"><td class="right">TOTAL</td><td class="right">${fm(opts.total)}</td></tr>
    </table></div>
    ${opts.observacoes ? `<div class="section-title">Observações</div><p style="font-size:12px;color:#555">${esc(opts.observacoes)}</p>` : ''}
    ${footerHtml()}
    ${autoPrint ? '<script>setTimeout(function(){window.print();},300);</script>' : ''}
  </body></html>`);
  w.document.close();
}
