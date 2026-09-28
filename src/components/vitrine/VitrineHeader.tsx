'use client';

import { useState, useEffect } from 'react';
import BuscaPremium from './BuscaPremium';
import LogoOficina from '@/components/LogoOficina';
import { CarrinhoIcone } from './CarrinhoIcone';
import { getClienteVitrine } from '@/lib/vitrine-session';
import { DADOS_OFICINA } from '@/lib/empresa';

interface CategoriaMenu { slug: string; nome: string; }

/**
 * Cabeçalho único da vitrine — vive no layout, não em cada página.
 *
 * Composição em três faixas (referência: pílula sticky do template-sass, que
 * encolhe ao rolar + a faixa de navegação do maryane):
 *   1. topbar  — endereço, horário e WhatsApp (some ao rolar)
 *   2. linha   — logo + busca + conta/favoritos/carrinho
 *   3. catbar  — pastilhas com TODAS as categorias que têm produto visível
 *
 * O menu é data-driven: as categorias vêm de /api/vitrine/categorias, que já
 * filtra (ativo && quantidadeLoja>0 && precoVenda>0) e ordena
 * CAPACETES → CAPAS → ACESSÓRIOS → alfabética. Nada é inventado aqui.
 */
export default function VitrineHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [cliente, setCliente] = useState<any>(null);
  const [categorias, setCategorias] = useState<CategoriaMenu[]>([]);

  // Encolhimento no scroll — dá mais área útil de catálogo sem perder o acesso.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setCliente(getClienteVitrine());
    fetch('/api/vitrine/categorias')
      .then(r => r.json())
      .then((d: any[]) => { if (Array.isArray(d)) setCategorias(d); })
      .catch(() => {});
  }, []);

  return (
    <header className={`mv-header ${scrolled ? 'mv-scrolled' : ''}`}>
      {/* 1. Faixa de utilidades */}
      <div className="mv-topbar">
        <div className="mv-container mv-topbar-row">
          <span className="flex items-center gap-1.5 truncate">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{DADOS_OFICINA.endereco} — {DADOS_OFICINA.cidade}</span>
          </span>
          <span className="flex items-center gap-4 flex-shrink-0">
            <span className="hidden sm:inline">{DADOS_OFICINA.horario}</span>
            <a href={`https://wa.me/${DADOS_OFICINA.whatsapp}`} target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 hover:text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
              {DADOS_OFICINA.telefone1}
            </a>
          </span>
        </div>
      </div>

      {/* 2. Linha principal */}
      <div className="mv-container mv-header-row">
        <a href="/vitrine" className="flex items-center gap-2.5 flex-shrink-0" aria-label="Marquinho Moto Peças — início">
          <LogoOficina
            className="w-10 h-10 rounded-xl bg-[#1a56a4] flex items-center justify-center overflow-hidden flex-shrink-0"
            imgClassName="w-full h-full object-contain"
            textClassName="font-extrabold text-white text-sm"
          />
          <span className="hidden sm:block leading-none">
            <span className="block font-extrabold text-[15px] tracking-tight text-white">Marquinho</span>
            <span className="block text-[10px] tracking-[0.14em] uppercase text-[#e8991a] font-bold mt-0.5">Moto Peças</span>
          </span>
        </a>

        {/* Busca — no mobile desce para a 2ª linha do cabeçalho (largura total);
            a partir de 768px ocupa o centro, crescendo entre logo e ações. */}
        <div className="mv-header-search">
          <BuscaPremium />
        </div>

        {/* Ações */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <a href={cliente ? '/vitrine/perfil' : '/vitrine/login'} className="mv-action" aria-label={cliente ? 'Meu perfil' : 'Entrar'}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="mv-action-label">
              {cliente ? (cliente.nome?.split(' ')[0] || 'Perfil') : 'Entrar'}
            </span>
          </a>
          <a href="/vitrine/favoritos" className="mv-action hidden sm:flex" aria-label="Favoritos">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="mv-action-label">Favoritos</span>
          </a>
          <CarrinhoIcone />
        </div>
      </div>

      {/* 3. Navegação por categorias — TODAS as categorias com produto visível.
             O trilho rola horizontalmente: nunca corta item em tela estreita. */}
      <nav className="mv-catbar" aria-label="Categorias">
        <div className="mv-container mv-catbar-row">
          <a href="/vitrine/catalogo" className="mv-cat font-bold text-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Catálogo
          </a>
          <span className="w-px h-5 bg-white/10 flex-shrink-0 mx-1" aria-hidden="true" />
          {categorias.map(c => (
            <a key={c.slug} href={`/vitrine/catalogo?categoria=${c.slug}`} className="mv-cat">
              {c.nome}
            </a>
          ))}
          <span className="w-px h-5 bg-white/10 flex-shrink-0 mx-1" aria-hidden="true" />
          <a href="/vitrine/promocoes" className="mv-cat mv-cat-hot font-bold">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            Promoções
          </a>
          <a href="/vitrine/marcas" className="mv-cat">Marcas</a>
        </div>
      </nav>
    </header>
  );
}
