'use client';

import { useState } from 'react';

/**
 * Faixa de newsletter. O POST para /api/vitrine/newsletter é o mesmo —
 * muda apenas a apresentação.
 */
export default function NewsletterVitrine() {
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function inscrever(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes('@')) return;
    setLoading(true);
    await fetch('/api/vitrine/newsletter', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, nome }),
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <section>
      <div className="mv-strip mv-strip-ink !items-stretch">
        <div className="flex-1 min-w-0">
          <span className="mv-eyebrow">Novidades da loja</span>
          <h2 className="text-xl md:text-2xl font-extrabold mt-3 leading-tight">Fique por dentro</h2>
          <p className="text-sm text-[var(--mv-text-on-dark-2)] mt-2 max-w-md leading-relaxed">
            Receba ofertas, chegada de peças e novidades direto no seu email.
          </p>
        </div>

        <div className="flex-1 min-w-0 flex items-center">
          {sent ? (
            <div className="flex items-center gap-2.5 text-[#7ee2a8]">
              <span className="w-9 h-9 rounded-full bg-[rgba(15,157,88,0.2)] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-sm font-bold">Inscrição confirmada. Obrigado!</span>
            </div>
          ) : (
            <form onSubmit={inscrever} className="flex flex-col sm:flex-row gap-2 w-full">
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome"
                className="flex-1 min-w-0 rounded-full bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-[var(--mv-text-on-dark-2)] outline-none focus:border-white/35 transition-colors" />
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="Seu melhor email"
                className="flex-1 min-w-0 rounded-full bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder:text-[var(--mv-text-on-dark-2)] outline-none focus:border-white/35 transition-colors" />
              <button type="submit" disabled={loading} className="mv-btn mv-btn-primary flex-shrink-0">
                {loading ? 'Enviando…' : 'Inscrever'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
