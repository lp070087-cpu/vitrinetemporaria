'use client';

import { useState } from 'react';

/**
 * Compartilhar produto.
 * Mecânica preservada: copiar link (clipboard) com confirmação temporária de 2s
 * e abertura do WhatsApp com o nome + link do produto.
 */
export default function CompartilharProduto({ nome, url }: { nome: string; url: string }) {
  const [open, setOpen] = useState(false);
  const [copiado, setCopiado] = useState(false);

  function copiar() {
    navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Olha esse produto: ${nome} — ${url}`)}`, '_blank');
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--mv-text-3)] hover:text-[var(--mv-brand)] transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
        Compartilhar
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(11,18,32,0.55)] backdrop-blur-sm"
          role="dialog" aria-modal="true" aria-label="Compartilhar produto"
          onClick={() => setOpen(false)}>
          <div className="bg-[var(--mv-surface)] rounded-[var(--mv-r-xl)] p-6 w-full max-w-[340px] shadow-[var(--mv-sh-xl)] border border-[var(--mv-line)]"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-extrabold text-[var(--mv-text)] mb-1">Compartilhar</h3>
            <p className="text-xs text-[var(--mv-text-2)] mb-4 truncate">{nome}</p>

            <div className="flex items-center gap-2 rounded-[var(--mv-r-md)] border border-[var(--mv-line)] bg-[var(--mv-surface-2)] px-3 py-2 mb-4">
              <span className="text-[10px] text-[var(--mv-text-3)] truncate flex-1 font-mono">{url}</span>
              <button onClick={copiar}
                className={`flex-none px-3 py-1.5 rounded-[var(--mv-r-sm)] text-[10px] font-extrabold transition-colors ${
                  copiado ? 'bg-[var(--mv-ok-soft)] text-[var(--mv-ok)]' : 'bg-[var(--mv-brand)] text-white hover:bg-[var(--mv-brand-hover)]'
                }`}>
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={shareWhatsApp}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[#25D366] hover:bg-[#1fb955] text-white rounded-[var(--mv-r-md)] text-xs font-extrabold transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
                WhatsApp
              </button>
              <button onClick={copiar}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-[var(--mv-surface-2)] hover:bg-[var(--mv-line)] text-[var(--mv-text-2)] rounded-[var(--mv-r-md)] text-xs font-extrabold transition-colors border border-[var(--mv-line)]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                Link
              </button>
            </div>

            <button onClick={() => setOpen(false)}
              className="w-full mt-3 py-2 text-xs text-[var(--mv-text-3)] hover:text-[var(--mv-text-2)] font-semibold">
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
