'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoOficina from '@/components/LogoOficina';
import { setClienteVitrine } from '@/lib/vitrine-session';

/**
 * Login / cadastro da loja.
 *
 * Regras preservadas: login SOMENTE por e-mail + senha; cadastro com
 * nome+sobrenome+telefone+email+senha (modelo da moto opcional); "manter conectado"
 * escolhe localStorage (persiste) ou sessionStorage; o `redirect` só aceita
 * caminhos internos `/vitrine/...` para não virar open redirect.
 */
export default function VitrineLogin() {
  const router = useRouter();
  const [isCadastro, setIsCadastro] = useState(false);
  const [form, setForm] = useState({ nome: '', sobrenome: '', telefone: '', email: '', password: '', modeloMoto: '' });
  const [manterConectado, setManterConectado] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  // Item 9 — redireciona de volta para onde o cliente estava (ex: /vitrine/checkout)
  // após login/cadastro. Só aceita caminhos internos (evita open redirect).
  const [redirect, setRedirect] = useState('/vitrine/carrinho');
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get('redirect');
      if (r && r.startsWith('/vitrine/')) setRedirect(r);
    } catch { /* ignora */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    try {
      // Login SOMENTE por email + senha (correção da DONA). Cadastro: nome+sobrenome+telefone+email+senha.
      const body = isCadastro
        ? {
            nome: form.nome, sobrenome: form.sobrenome, telefone: form.telefone,
            email: form.email, password: form.password, modeloMoto: form.modeloMoto || null,
          }
        : { email: form.email.trim(), password: form.password };
      const r = await fetch('/api/vitrine/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const { token, cliente } = await r.json();
        // "Manter conectado" REAL: checked → localStorage (persiste); unchecked → sessionStorage.
        setClienteVitrine({
          id: cliente.id, nome: cliente.nome, telefone: cliente.telefone,
          email: cliente.email || null, modeloMoto: cliente.modeloMoto, token,
        }, manterConectado);
        router.push(redirect);
      } else {
        const e = await r.json();
        setMsg(e.error || 'Erro.');
      }
    } catch {
      setMsg('Erro de conexão.');
    }
    setLoading(false);
  }

  return (
    <div className="mv-container mv-section">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center max-w-5xl mx-auto">

        {/* COLUNA INSTITUCIONAL — some no celular para o formulário vir primeiro */}
        <div className="hidden lg:block">
          <span className="mv-eyebrow !bg-[var(--mv-brand-soft)] !border-[var(--mv-brand-line)] !text-[var(--mv-brand)]">
            Área do cliente
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-[var(--mv-text)] mt-4 leading-tight">
            Acompanhe seus pedidos e favoritos
          </h2>
          <p className="text-sm text-[var(--mv-text-2)] mt-3 leading-relaxed max-w-md">
            Com a conta você salva peças, vê o histórico de compras e acompanha o código
            de retirada na loja.
          </p>

          <ul className="mt-7 flex flex-col gap-3.5">
            {[
              { t: 'Histórico de pedidos', d: 'Veja tudo o que já foi comprado na loja.' },
              { t: 'Favoritos salvos', d: 'Guarde as peças que você usa sempre.' },
              { t: 'Código de retirada', d: 'Acompanhe a separação do seu pedido.' },
            ].map(item => (
              <li key={item.t} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--mv-ok-soft)] text-[var(--mv-ok)] flex items-center justify-center flex-none mt-0.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M5 13l4 4L19 7" /></svg>
                </span>
                <span>
                  <span className="block text-sm font-bold text-[var(--mv-text)]">{item.t}</span>
                  <span className="block text-xs text-[var(--mv-text-2)] mt-0.5">{item.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* FORMULÁRIO */}
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <button type="button" onClick={() => router.push('/vitrine')}
            className="text-xs font-semibold text-[var(--mv-text-3)] hover:text-[var(--mv-text)] mb-5 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" /></svg>
            Voltar para a loja
          </button>

          <div className="text-center lg:text-left mb-6">
            <LogoOficina className="w-14 h-14 rounded-xl bg-[var(--mv-brand)] flex items-center justify-center mx-auto lg:mx-0 mb-3 overflow-hidden" textClassName="text-white font-extrabold text-lg" />
            <h1 className="text-xl font-extrabold text-[var(--mv-text)] tracking-tight">Marquinho Moto Peças</h1>
            <p className="text-xs text-[var(--mv-text-2)] mt-1">
              {isCadastro ? 'Crie sua conta para comprar mais rápido' : 'Acesse sua conta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mv-panel !p-6 flex flex-col gap-4">
            {msg && (
              <div className="bg-[var(--mv-alert-soft)] text-[var(--mv-alert)] px-4 py-2.5 rounded-[var(--mv-r-md)] text-xs font-semibold" role="alert">
                {msg}
              </div>
            )}

            {isCadastro && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="mv-label" htmlFor="mv-nome">Nome</label>
                  <input id="mv-nome" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                    className="mv-input w-full" placeholder="Nome" required />
                </div>
                <div>
                  <label className="mv-label" htmlFor="mv-sobrenome">Sobrenome</label>
                  <input id="mv-sobrenome" value={form.sobrenome} onChange={e => setForm({ ...form, sobrenome: e.target.value })}
                    className="mv-input w-full" placeholder="Sobrenome" required />
                </div>
              </div>
            )}

            {/* Login: SOMENTE email + senha. Cadastro: email obrigatório + telefone. */}
            <div>
              <label className="mv-label" htmlFor="mv-email">E-mail</label>
              <input id="mv-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="mv-input w-full" placeholder="seu@email.com" required />
            </div>

            {isCadastro && (
              <div>
                <label className="mv-label" htmlFor="mv-tel">Telefone / WhatsApp</label>
                <input id="mv-tel" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
                  className="mv-input w-full" placeholder="(81) 99999-9999" required />
              </div>
            )}

            <div>
              <label className="mv-label" htmlFor="mv-senha">Senha</label>
              <div className="relative">
                <input id="mv-senha" type={verSenha ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="mv-input w-full !pr-10" placeholder="Mínimo 4 caracteres" required />
                <button type="button" onClick={() => setVerSenha(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--mv-text-3)] hover:text-[var(--mv-text)] rounded-md"
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
                  {verSenha ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-2.209m5.857-2.533A9.98 9.98 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.972 9.972 0 01-3.315 4.528M3 3l18 18" /></svg>
                  )}
                </button>
              </div>
            </div>

            {isCadastro && (
              <div>
                <label className="mv-label" htmlFor="mv-moto">Modelo da moto (opcional)</label>
                <input id="mv-moto" value={form.modeloMoto} onChange={e => setForm({ ...form, modeloMoto: e.target.value })}
                  className="mv-input w-full" placeholder="Ex: CG 160" />
              </div>
            )}

            {!isCadastro && (
              <label className="flex items-center gap-2 text-xs text-[var(--mv-text-2)] cursor-pointer select-none">
                <input type="checkbox" checked={manterConectado} onChange={e => setManterConectado(e.target.checked)}
                  className="rounded w-3.5 h-3.5 accent-[var(--mv-brand)]" />
                Manter conectado neste aparelho
              </label>
            )}

            <button type="submit" disabled={loading} className="mv-btn mv-btn-ok mv-btn-block mv-btn-lg">
              {loading ? 'Carregando…' : isCadastro ? 'Criar conta' : 'Entrar'}
            </button>

            {!isCadastro && (
              <p className="text-center text-[11px] text-[var(--mv-text-3)]">
                Esqueceu a senha? Fale com a loja no{' '}
                <a href="https://wa.me/558198143879" target="_blank" rel="noopener noreferrer"
                  className="font-bold text-[var(--mv-ok)] hover:underline">WhatsApp</a>.
              </p>
            )}

            <button type="button" onClick={() => { setIsCadastro(!isCadastro); setMsg(''); }}
              className="w-full text-xs font-bold text-[var(--mv-brand)] hover:underline pt-1 border-t border-[var(--mv-line)] mt-1">
              {isCadastro ? 'Já tenho conta — entrar' : 'Não tenho conta — criar agora'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
