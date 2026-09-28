'use client';

import { useEffect, useState } from 'react';
import { DADOS_OFICINA } from '@/lib/empresa';
import LogoOficina from '@/components/LogoOficina';

/**
 * Rodapé da vitrine — vive no layout, junto com o cabeçalho.
 *
 * Faixa de vantagens + cinco colunas de links. As categorias continuam vindo
 * de /api/vitrine/categorias (só as que têm produto visível): nenhum slug é
 * inventado, então não há link quebrado.
 */
export default function RodapePremium() {
  const ano = new Date().getFullYear();
  const [catsFooter, setCatsFooter] = useState<{ slug: string; nome: string }[]>([]);

  useEffect(() => {
    fetch('/api/vitrine/categorias').then(r => r.json()).then((d: any[]) => {
      if (Array.isArray(d)) setCatsFooter(d.slice(0, 6).map(c => ({ slug: c.slug, nome: c.nome })));
    }).catch(() => {});
  }, []);

  const vantagens = [
    {
      titulo: 'Retirada Grátis',
      desc: 'Na loja, em até 2h',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M5 13l4 4L19 7" />,
    },
    {
      titulo: 'Separação Rápida',
      desc: 'Pedido pronto em até 2h',
      icon: <><circle cx="12" cy="12" r="9" strokeWidth={1.6} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 7v5l3 2" /></>,
    },
    {
      titulo: 'Peças com Garantia',
      desc: '3 meses contra defeito de fábrica',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    },
    {
      titulo: 'Atendimento Direto',
      desc: 'Fale com a loja no WhatsApp',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
    },
  ];

  return (
    <footer className="mv-footer">
      {/* Faixa de vantagens */}
      <div className="mv-container py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {vantagens.map(v => (
            <div key={v.titulo} className="mv-benefit">
              <span className="w-10 h-10 rounded-xl bg-[rgba(232,153,26,0.13)] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#e8991a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">{v.icon}</svg>
              </span>
              <span>
                <span className="block text-[13px] font-bold text-white">{v.titulo}</span>
                <span className="block text-[11px] mt-0.5 leading-snug">{v.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Colunas de links */}
      <div className="border-t border-[var(--mv-ink-line)]">
        <div className="mv-container py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">

            {/* Marca */}
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <LogoOficina
                  className="w-10 h-10 rounded-xl bg-[#1a56a4] flex items-center justify-center overflow-hidden flex-shrink-0"
                  imgClassName="w-full h-full object-contain"
                  textClassName="font-extrabold text-white text-sm"
                />
                <span className="leading-none">
                  <span className="block font-extrabold text-white text-sm">Marquinho</span>
                  <span className="block text-[10px] tracking-[0.14em] uppercase text-[#e8991a] font-bold mt-0.5">Moto Peças</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs">{DADOS_OFICINA.institucional}</p>
              <p className="text-[11px] mt-4 leading-relaxed">
                {DADOS_OFICINA.endereco}<br />{DADOS_OFICINA.cidade}
              </p>
            </div>

            {/* Categorias — data-driven */}
            <div>
              <h3 className="mv-footer-title">Categorias</h3>
              {catsFooter.length > 0 ? catsFooter.map(c => (
                <a key={c.slug} href={`/vitrine/catalogo?categoria=${c.slug}`} className="mv-footer-link">{c.nome}</a>
              )) : (
                <a href="/vitrine/catalogo" className="mv-footer-link">Ver catálogo</a>
              )}
            </div>

            {/* Links úteis */}
            <div>
              <h3 className="mv-footer-title">Navegar</h3>
              <a href="/vitrine/catalogo" className="mv-footer-link">Catálogo completo</a>
              <a href="/vitrine/promocoes" className="mv-footer-link">Promoções</a>
              <a href="/vitrine/marcas" className="mv-footer-link">Marcas</a>
              <a href="/vitrine/favoritos" className="mv-footer-link">Meus favoritos</a>
            </div>

            {/* Atendimento */}
            <div>
              <h3 className="mv-footer-title">Atendimento</h3>
              <a href={`https://wa.me/${DADOS_OFICINA.whatsapp}`} target="_blank" rel="noopener noreferrer"
                className="mv-footer-link flex items-center gap-2">
                <svg className="w-4 h-4 text-[#0f9d58] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                {DADOS_OFICINA.telefone1}
              </a>
              <a href={`tel:${DADOS_OFICINA.telefone2}`} className="mv-footer-link">{DADOS_OFICINA.telefone2}</a>
              <p className="text-[11px] mt-2 pt-2 border-t border-[var(--mv-ink-line)] leading-relaxed">{DADOS_OFICINA.horario}</p>
            </div>

            {/* Conta — fica por último. No celular, "Atendimento" salta para a
                coluna da direita (2ª), então os caminhos de compra continuam
                visíveis sem repetir links entre colunas. */}
            <div>
              <h3 className="mv-footer-title">Minha Conta</h3>
              <a href="/vitrine/login" className="mv-footer-link">Entrar / Cadastrar</a>
              <a href="/vitrine/perfil" className="mv-footer-link">Meus pedidos</a>
              <a href="/vitrine/carrinho" className="mv-footer-link">Meu carrinho</a>
              <a href="/vitrine/checkout" className="mv-footer-link">Finalizar pedido</a>
            </div>
          </div>
        </div>
      </div>

      {/* Barra final */}
      <div className="border-t border-[var(--mv-ink-line)]">
        <div className="mv-container py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p className="text-center sm:text-left">
            Marquinho Moto Peças © {ano} — Todos os direitos reservados. CNPJ: {DADOS_OFICINA.cnpj}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[var(--mv-text-3)]">Pagamento na retirada:</span>
            {['PIX', 'Crédito', 'Débito', 'Dinheiro'].map(f => (
              <span key={f} className="px-2 py-1 rounded-md bg-[rgba(255,255,255,0.06)] border border-[var(--mv-ink-line)] text-[10px] font-semibold text-[var(--mv-text-on-dark-2)]">{f}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
