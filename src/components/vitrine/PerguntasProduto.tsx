'use client';

import { useState, useEffect } from 'react';
import { getClienteVitrine } from '@/lib/vitrine-session';

/**
 * Perguntas e respostas do produto.
 * Mecânica preservada: exige login para perguntar, a nova pergunta entra no topo
 * da lista, a mensagem some sozinha após 3s e as respostas oficiais ficam
 * indentadas sob a pergunta.
 */
export default function PerguntasProduto({ pecaId }: { pecaId: string }) {
  const [perguntas, setPerguntas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [novaPergunta, setNovaPergunta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch(`/api/vitrine/perguntas?pecaId=${pecaId}`).then(r => r.json()).then(d => {
      setPerguntas(d.perguntas || []);
      setLoading(false);
    });
  }, [pecaId]);

  async function enviar() {
    if (!novaPergunta.trim()) return;
    const cliente = getClienteVitrine();
    if (!cliente) { setMsg('Faça login para perguntar.'); return; }
    const { token } = cliente;
    setEnviando(true);
    const r = await fetch('/api/vitrine/perguntas', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pecaId, texto: novaPergunta }),
    });
    if (r.ok) {
      const p = await r.json();
      setPerguntas(prev => [p, ...prev]);
      setNovaPergunta('');
      setMsg('Pergunta enviada!');
    } else {
      const e = await r.json();
      setMsg(e.error || 'Erro.');
    }
    setEnviando(false);
    setTimeout(() => setMsg(''), 3000);
  }

  return (
    <div>
      {/* Form */}
      <div className="mb-6">
        <label className="mv-label" htmlFor="mv-pergunta">Tem alguma dúvida? Pergunte aqui:</label>
        <textarea id="mv-pergunta" value={novaPergunta} onChange={e => setNovaPergunta(e.target.value)}
          className="mv-input w-full text-xs resize-y" rows={2}
          placeholder="Ex: Este produto serve na CG 160 2020?" />
        <div className="flex items-center justify-between mt-2.5 gap-3">
          <button onClick={enviar} disabled={enviando || !novaPergunta.trim()} className="mv-btn mv-btn-primary">
            {enviando ? 'Enviando…' : 'Perguntar'}
          </button>
          {msg && <span className="text-[11px] text-[var(--mv-text-2)] font-semibold">{msg}</span>}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="py-6 flex justify-center"><span className="mv-spin" /></div>
      ) : perguntas.length === 0 ? (
        <div className="mv-empty">
          <svg className="w-10 h-10 mx-auto text-[var(--mv-line-strong)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-[var(--mv-text-3)]">Nenhuma pergunta ainda. Seja o primeiro a perguntar!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {perguntas.map((p: any) => (
            <div key={p.id} className="rounded-[var(--mv-r-lg)] border border-[var(--mv-line)] bg-[var(--mv-surface-2)] p-4">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-[var(--mv-brand-soft)] text-[var(--mv-brand)] flex items-center justify-center flex-none text-[11px] font-extrabold">?</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--mv-text)]">{p.texto}</p>
                  <p className="text-[10px] text-[var(--mv-text-3)] mt-1">
                    {p.cliente.nome} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              {p.respostas.length > 0 && (
                <div className="ml-4 mt-3 pl-4 border-l-2 border-[var(--mv-brand-line)] flex flex-col gap-2.5">
                  {p.respostas.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-[var(--mv-ok-soft)] text-[var(--mv-ok)] flex items-center justify-center flex-none">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.6} d="M5 13l4 4L19 7" /></svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-[var(--mv-text-2)] leading-relaxed">{r.texto}</p>
                        <p className="text-[10px] text-[var(--mv-brand)] font-bold mt-1">
                          Marquinho · {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
