'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CardProdutoPremium from '@/components/vitrine/CardProdutoPremium';
import { getClienteVitrine } from '@/lib/vitrine-session';

/**
 * Favoritos do cliente. Mesma mecânica: exige sessão (redireciona ao login
 * guardando a intenção) e remove o item da lista assim que ele é desfavoritado.
 */
export default function FavoritosPage() {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const d = getClienteVitrine();
    if (!d) { router.push('/vitrine/login?redirect=/vitrine/favoritos'); return; }

    fetch('/api/vitrine/favoritos', { headers: { Authorization: `Bearer ${d.token}` } })
      .then(r => r.json()).then(data => {
        setFavoritos(Array.isArray(data) ? data : []);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [router]);

  async function toggleFavorito(pecaId: string) {
    const d = getClienteVitrine();
    await fetch('/api/vitrine/favoritos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${d?.token}` },
      body: JSON.stringify({ pecaId }),
    });
    setFavoritos(prev => prev.filter(f => f.pecaId !== pecaId));
  }

  return (
    <div className="mv-container mv-section">
      <nav className="mv-crumbs mb-3" aria-label="Você está aqui">
        <a href="/vitrine">Início</a>
        <span>/</span>
        <span className="text-[var(--mv-text-2)]">Favoritos</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--mv-text)]">Meus favoritos</h1>
        <p className="text-sm text-[var(--mv-text-2)] mt-1.5">
          {loading ? 'Carregando…' : `${favoritos.length} ${favoritos.length === 1 ? 'produto salvo' : 'produtos salvos'}`}
        </p>
      </div>

      {loading ? (
        <div className="mv-grid">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mv-skel aspect-[3/4] rounded-[var(--mv-r-lg)]" />)}
        </div>
      ) : favoritos.length === 0 ? (
        <div className="mv-empty !py-20">
          <svg className="w-14 h-14 mx-auto text-[var(--mv-line-strong)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <p className="text-base font-bold text-[var(--mv-text)]">Nenhum favorito salvo ainda</p>
          <p className="text-xs text-[var(--mv-text-3)] mt-1 mb-6">
            Toque no coração de um produto para guardá-lo aqui.
          </p>
          <a href="/vitrine/catalogo" className="mv-btn mv-btn-primary mv-btn-lg">Explorar catálogo</a>
        </div>
      ) : (
        <div className="mv-grid">
          {favoritos.map((f: any) => (
            <CardProdutoPremium key={f.id} p={f.peca} onFavorito={toggleFavorito} favorited={true} />
          ))}
        </div>
      )}
    </div>
  );
}
