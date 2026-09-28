'use client';

/**
 * Frete e Prazo — a loja opera SOMENTE com retirada na loja.
 * AJUSTE 2: remover qualquer menção a "Entrega em breve", simulação de
 * entrega, prazo de Correios ou frete inventado. Este bloco mostra apenas
 * a retirada, que é a realidade do negócio.
 */
export default function FretePrazo({ pecaId }: { pecaId: string }) {
  return (
    <div className="mv-panel !p-4">
      <h4 className="flex items-center gap-2 text-xs font-extrabold text-[var(--mv-text)] mb-3">
        <svg className="w-4 h-4 text-[var(--mv-brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        Retirada
      </h4>
      <div className="rounded-[var(--mv-r-md)] border border-[var(--mv-line)] bg-[var(--mv-surface-2)] p-3.5">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-[11px] font-bold text-[var(--mv-text-2)]">Retirada na Loja</span>
          <span className="mv-badge mv-badge-ok !text-[10px] !px-2 !py-0.5">Grátis</span>
        </div>
        <p className="text-[10px] text-[var(--mv-text-3)]">Retire em até 2h após confirmação do pedido</p>
      </div>
    </div>
  );
}
