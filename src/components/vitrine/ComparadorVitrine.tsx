'use client';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Produto {
  id: string; nome: string; precoVenda: number; precoOferta?: number; precoVitrine?: number;
  marca?: string; compatibilidade?: string; imagemUrl?: string;
  garantia?: string; descricaoCurta?: string;
  categoria: { nome: string; slug: string };
}

// Preço público oficial (item 6): precoVitrine > precoOferta > precoVenda.
function precoPublico(p: Produto): number {
  const pv = p.precoVitrine != null ? Number(p.precoVitrine) : NaN;
  if (Number.isFinite(pv) && pv > 0) return pv;
  if (p.precoOferta && Number(p.precoOferta) < Number(p.precoVenda)) return Number(p.precoOferta);
  return Number(p.precoVenda) || 0;
}

/**
 * Comparador lado a lado. Atributos e precedência de preço idênticos ao original.
 */
export default function ComparadorVitrine({ produtos, onClose }: { produtos: Produto[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-[rgba(11,18,32,0.6)] backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      role="dialog" aria-modal="true" aria-label="Comparar produtos" onClick={onClose}>
      <div className="bg-[var(--mv-surface)] rounded-[var(--mv-r-xl)] shadow-[var(--mv-sh-xl)] border border-[var(--mv-line)] max-w-4xl w-full max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-extrabold text-[var(--mv-text)] tracking-tight">Comparar Produtos</h2>
            <button onClick={onClose} aria-label="Fechar comparador"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--mv-text-3)] hover:text-[var(--mv-text)] hover:bg-[var(--mv-surface-2)] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {produtos.length === 0 ? (
            <p className="text-center text-sm text-[var(--mv-text-3)] py-10">Nenhum produto selecionado para comparar.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left py-2 px-3 text-[var(--mv-text-3)] font-semibold w-20 sm:w-32 uppercase tracking-wider text-[10px]">Atributo</th>
                    {produtos.map(p => (
                      <th key={p.id} className="py-2 px-3 text-center min-w-[112px] sm:min-w-[180px] align-top">
                        <div className="w-20 h-20 rounded-[var(--mv-r-md)] border border-[var(--mv-line)] bg-[var(--mv-surface-2)] mx-auto mb-2 overflow-hidden">
                          {p.imagemUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imagemUrl} alt={p.nome} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-8 h-8 text-[var(--mv-line-strong)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16"/></svg>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-[var(--mv-text)] leading-snug">{p.nome}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <LinhaComparacao label="Preço" valores={produtos.map(p => fm(precoPublico(p)))} destaque />
                  <LinhaComparacao label="Marca" valores={produtos.map(p => p.marca || '-')} />
                  <LinhaComparacao label="Categoria" valores={produtos.map(p => p.categoria.nome)} />
                  <LinhaComparacao label="Compatibilidade" valores={produtos.map(p => p.compatibilidade || '-')} />
                  <LinhaComparacao label="Descrição" valores={produtos.map(p => p.descricaoCurta || '-')} />
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LinhaComparacao({ label, valores, destaque = false }: { label: string; valores: string[]; destaque?: boolean }) {
  return (
    <tr className="border-t border-[var(--mv-line)] hover:bg-[var(--mv-surface-2)]">
      <td className="py-3 px-3 font-semibold text-[var(--mv-text-3)] text-[10px] uppercase tracking-wider align-top">{label}</td>
      {valores.map((v, i) => (
        <td key={i} className={`py-3 px-3 text-center align-top ${destaque ? 'text-sm font-extrabold text-[var(--mv-text)] tabular-nums' : 'text-[var(--mv-text-2)]'}`}>{v}</td>
      ))}
    </tr>
  );
}
