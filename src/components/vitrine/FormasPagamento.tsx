'use client';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Formas de Pagamento (Vitrine pública).
 * AJUSTE 3+4: PIX usa o MESMO valor do produto (sem desconto inventado).
 * Sem tabela de parcelas e sem juros inventados — apenas as 4 formas oficiais.
 *
 * Ícones em SVG no lugar de emoji: emoji muda de desenho conforme o sistema
 * operacional e quebra a coerência visual da loja.
 */
const FORMAS = [
  {
    key: 'PIX',
    titulo: 'PIX',
    desc: 'Pagamento instantâneo',
    icone: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 3l8 8-8 8-4-4M11 21l-8-8 8-8 4 4" /></>,
  },
  {
    key: 'CARTAO_CREDITO',
    titulo: 'Cartão de Crédito',
    desc: 'Na retirada',
    icone: <><rect x="2" y="5" width="20" height="14" rx="2.5" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M2 10h20" /></>,
  },
  {
    key: 'CARTAO_DEBITO',
    titulo: 'Cartão de Débito',
    desc: 'Na retirada',
    icone: <><rect x="2" y="5" width="20" height="14" rx="2.5" strokeWidth={1.8} /><path strokeLinecap="round" strokeWidth={1.8} d="M2 10h20M6 15h3" /></>,
  },
  {
    key: 'DINHEIRO',
    titulo: 'Dinheiro',
    desc: 'Na retirada',
    icone: <><rect x="2" y="6" width="20" height="12" rx="2.5" strokeWidth={1.8} /><circle cx="12" cy="12" r="2.5" strokeWidth={1.8} /></>,
  },
];

export default function FormasPagamento({ preco }: { preco: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {FORMAS.map(f => (
        <div key={f.key} className="flex items-center gap-3 p-3.5 rounded-[var(--mv-r-lg)] border border-[var(--mv-line)] bg-[var(--mv-surface-2)]">
          <span className="w-9 h-9 rounded-[var(--mv-r-md)] bg-[var(--mv-surface)] border border-[var(--mv-line)] flex items-center justify-center flex-none text-[var(--mv-brand)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{f.icone}</svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[var(--mv-text)] truncate">{f.titulo}</p>
            <p className="text-[10px] text-[var(--mv-text-3)]">{f.desc}</p>
          </div>
          <span className="ml-auto text-xs font-extrabold text-[var(--mv-text)] tabular-nums flex-none">{fm(preco)}</span>
        </div>
      ))}
    </div>
  );
}
