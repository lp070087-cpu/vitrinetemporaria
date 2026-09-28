'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DADOS_OFICINA } from '@/lib/empresa';

interface Banner {
  id: string; titulo?: string; subtitulo?: string;
  imagemDesktop?: string; imagemMobile?: string;
  ctaTexto?: string; ctaLink?: string; ativo: boolean;
  corTexto?: string; overlay?: string; opacidade?: string; posicaoConteudo?: string;
  exibirEm?: string;
  /** Opcional: força o painel de texto em 'claro' ou 'escuro'. Ausente = decide pela corTexto. */
  painel?: string;
}

/**
 * Cor de texto clara ou escura? Serve para escolher o painel de texto que
 * acompanha a arte — painel escuro para texto claro, painel claro para texto
 * escuro. Lê #rgb, #rrggbb e rgb()/rgba(); qualquer outro valor cai no claro.
 */
function corClara(cor?: string): boolean {
  if (!cor) return true;
  const s = cor.trim();
  let r: number, g: number, b: number;
  const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else {
    const m = s.match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
    if (!m) return true;
    r = Number(m[1]); g = Number(m[2]); b = Number(m[3]);
  }
  // Luminância relativa (ITU-R BT.601) — acima de 128 o texto é claro.
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

/**
 * Carrossel de banners — 100% data-driven da DONA (/api/vitrine/banners).
 *
 * REGRA MANTIDA: a arte é exibida INTEIRA, nunca cortada. O container tem
 * exatamente a proporção oficial (4:1 desktop, 2:1 mobile) e a imagem usa
 * `object-contain`. Por isso os banners cadastrados aparecem completos.
 *
 * REGRA NOVA (revisão visual): o texto do banner NUNCA fica sobre a arte.
 * No celular ele ocupa um painel acima da imagem; no desktop, uma coluna ao
 * lado dela. A arte não perde um pixel para o texto.
 *
 * Respeita `exibirEm` (AMBOS/DESKTOP/MOBILE), `corTexto`, `overlay`/`opacidade`
 * e `posicaoConteudo`.
 */
export default function BannerCarrossel({ banners: propBanners }: { banners?: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [banners, setBanners] = useState<Banner[]>(propBanners || []);
  const [carregado, setCarregado] = useState(!!propBanners);
  const [isDesktop, setIsDesktop] = useState(false);
  const [imgFalhou, setImgFalhou] = useState<Record<string, boolean>>({});

  // Item 3: quando chamado sem prop (Vitrine pública), busca do /api/vitrine/banners
  // que já retorna SÓ banners ativos dentro do período (GET público).
  useEffect(() => {
    if (propBanners && propBanners.length > 0) { setBanners(propBanners); setCarregado(true); return; }
    fetch('/api/vitrine/banners').then(r => r.json()).then((d: Banner[]) => {
      if (Array.isArray(d)) setBanners(d);
    }).catch(() => {}).finally(() => setCarregado(true));
  }, [propBanners]);

  // Rodada Subcategorias (2026-08-21): detecta desktop/mobile para respeitar exibirEm.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const atualizar = () => setIsDesktop(mq.matches);
    atualizar();
    mq.addEventListener('change', atualizar);
    return () => mq.removeEventListener('change', atualizar);
  }, []);

  const active = banners.filter(b => b.ativo);

  // Filtra pelo destino configurado: AMBOS (default) → todos; DESKTOP → só desktop; MOBILE → só mobile.
  const visiveis = active.filter(b => {
    const exibir = (b.exibirEm || 'AMBOS').toUpperCase();
    if (exibir === 'DESKTOP') return isDesktop;
    if (exibir === 'MOBILE') return !isDesktop;
    return true; // AMBOS (ou valor desconhecido) → ambos
  });

  const next = useCallback(() => setCurrent(prev => (prev + 1) % (visiveis.length || 1)), [visiveis.length]);
  const prev = useCallback(() => setCurrent(prev => prev === 0 ? (visiveis.length || 1) - 1 : prev - 1), [visiveis.length]);

  useEffect(() => {
    if (visiveis.length <= 1 || paused) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [visiveis.length, paused, next]);

  // Se a lista visível mudou (ex.: trocou de dispositivo), ajusta o índice.
  useEffect(() => {
    if (current >= visiveis.length) setCurrent(0);
  }, [visiveis.length, current]);

  if (!carregado) {
    return (
      <section className="mv-hero" aria-busy="true" aria-label="Carregando destaque da loja">
        <div className="mv-hero-inner">
          <div className="mv-banner-art mv-banner-skel mv-skel" />
        </div>
      </section>
    );
  }

  // Nenhum banner ativo cadastrado → capa institucional própria (nunca um vão vazio).
  // Só identidade + caminhos de navegação: nenhum dado comercial é inventado aqui.
  if (visiveis.length === 0) {
    return (
      <section className="mv-hero" aria-label="Capa da loja">
        <div className="mv-hero-inner">
          <div className="mv-hero-fallback">
            <div className="mv-container">
              <span className="mv-eyebrow mb-3">Marquinho Moto Peças</span>
              <h1 className="mv-hero-title max-w-2xl">Tudo para sua moto, com preço de loja de bairro</h1>
              <p className="mv-hero-text mt-4">
                Peças, acessórios, pneus e óleos com retirada na loja. Monte seu pedido online
                e retire em até 2 horas.
              </p>
              <div className="flex items-center gap-2.5 flex-wrap mt-6">
                <Link href="/vitrine/catalogo" className="mv-btn mv-btn-primary mv-btn-lg">Ver catálogo completo</Link>
                <a href={`https://wa.me/${DADOS_OFICINA.whatsapp}`} target="_blank" rel="noopener noreferrer"
                  className="mv-btn mv-btn-lg bg-white/10 text-white border-white/20 hover:bg-white/15">
                  Falar com a loja
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const b = visiveis[current];
  const txtColor = b.corTexto || '#ffffff';
  const overlayStyle = b.overlay ? { backgroundColor: b.overlay, opacity: parseFloat(b.opacidade || '0.3') } : {};
  const exibir = (b.exibirEm || 'AMBOS').toUpperCase();
  const mostrarDesktop = exibir === 'AMBOS' || exibir === 'DESKTOP';
  const mostrarMobile = exibir === 'AMBOS' || exibir === 'MOBILE';
  const alinhadoDireita = b.posicaoConteudo === 'right';

  // Sem imagem cadastrada → hero próprio (nunca um retângulo vazio).
  const semImagem = !b.imagemDesktop;

  // Cor da imagem para a moldura que aparece ATRÁS dela na letra morta do
  // `object-contain`: clara para arte clara, escura para arte escura. Sem isso,
  // a faixa ao redor de um banner claro formava uma tarja preta dura.
  const barraClara = corClara(b.corTexto) === false;
  // Preferência por eixo: 'auto' (padrão) decide pela cor; quem quiser forçar
  // usa o campo opcional `painel` do cadastro.
  const painelPreferido = (b as any).painel as string | undefined;
  const painelEscuro = painelPreferido === 'escuro' ? true
    : painelPreferido === 'claro' ? false
    : corClara(b.corTexto);

  const stageCls = [
    'mv-banner-stage',
    alinhadoDireita ? 'mv-banner-stage-right' : '',
    painelEscuro ? '' : 'mv-banner-stage-light',
  ].filter(Boolean).join(' ');

  // No celular mostramos a arte do eixo correspondente; o painel de texto vem
  // ANTES no DOM e o `order` do CSS coloca a arte em cima no desktop.
  const arteDesktop = mostrarDesktop && b.imagemDesktop;
  const arteMobile = mostrarMobile ? (b.imagemMobile || b.imagemDesktop) : null;

  const copy = (compacto: boolean) => (
    <div className={`${compacto ? 'max-w-md' : 'max-w-lg'} w-full`}>
      {b.titulo && (
        <span className="mv-eyebrow mb-2.5" style={painelEscuro ? undefined : { color: 'var(--mv-warn)' }}>{b.titulo}</span>
      )}
      {b.subtitulo && (
        <h1 className={compacto ? 'text-[1.35rem] font-extrabold leading-tight tracking-tight' : 'mv-hero-title !text-2xl lg:!text-3xl'}
          style={{ color: painelEscuro ? txtColor : undefined }}>
          {b.subtitulo}
        </h1>
      )}
      {b.ctaLink && b.ctaTexto && (
        <Link href={b.ctaLink} className={`mv-btn mv-btn-primary ${compacto ? 'mt-4' : 'mt-5'}`}>
          {b.ctaTexto}
        </Link>
      )}
    </div>
  );

  return (
    <section className="mv-hero" aria-label="Destaques da loja"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mv-hero-inner">
        {!semImagem && (
          <div className={stageCls}>
            {/* O texto vem PRIMEIRO no DOM (ordem de leitura correta no celular,
                onde ele aparece acima da arte) e o CSS o joga para a direita no
                desktop quando `posicaoConteudo` for 'right'. */}
            <div className={`mv-banner-copy ${painelEscuro ? '' : 'mv-banner-copy-light'} ${alinhadoDireita ? 'mv-banner-copy-right' : ''}`}>
              {copy(true)}
            </div>

            {/* ARTE — sem nenhum texto por cima. */}
            <div className="mv-banner-art" style={{ background: barraClara ? 'var(--mv-surface-2)' : 'var(--mv-ink-2)' }}>
              {/* Overlay configurável pela DONA — agora atrás da ARTE, não do texto. */}
              <div className="absolute inset-0 z-0 pointer-events-none" style={overlayStyle} />
              {arteMobile && !imgFalhou[arteMobile] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={arteMobile} alt={b.titulo || 'Banner da loja'}
                  onError={() => setImgFalhou(prev => ({ ...prev, [arteMobile]: true }))} />
              ) : arteDesktop && !imgFalhou[arteDesktop] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={arteDesktop} alt={b.titulo || 'Banner da loja'}
                  onError={() => setImgFalhou(prev => ({ ...prev, [arteDesktop]: true }))} />
              ) : (
                /* Imagem ausente ou quebrada → fundo institucional, nunca o
                   ícone de imagem quebrada do navegador. */
                <div className="mv-banner-erro" />
              )}
            </div>
          </div>
        )}

        {/* Sem imagem: hero próprio com gradiente + conteúdo completo.
            Respeita exibirEm (AMBOS/DESKTOP/MOBILE). */}
        {semImagem && (
          <div className={`mv-hero-fallback ${mostrarDesktop && mostrarMobile ? '' : mostrarDesktop ? 'hidden md:block' : 'md:hidden'}`}>
            <div className="mv-container">
              <div className={alinhadoDireita ? 'ml-auto text-right' : ''}>
                <div className={alinhadoDireita ? 'ml-auto' : ''}>
                  {b.titulo && <span className="mv-eyebrow mb-3">{b.titulo}</span>}
                  <h1 className="mv-hero-title max-w-2xl" style={{ color: txtColor }}>
                    {b.subtitulo || 'Tudo para sua moto, com preço de loja de bairro'}
                  </h1>
                  <p className="mv-hero-text mt-4">
                    Peças, acessórios, pneus e óleos com retirada na loja. Monte seu pedido online
                    e retire em até 2 horas.
                  </p>
                  <div className={`flex items-center gap-2.5 flex-wrap mt-6 w-full ${alinhadoDireita ? 'justify-end' : ''}`}>
                    {b.ctaLink && b.ctaTexto ? (
                      <Link href={b.ctaLink} className="mv-btn mv-btn-primary mv-btn-lg max-w-full">{b.ctaTexto}</Link>
                    ) : (
                      <Link href="/vitrine/catalogo" className="mv-btn mv-btn-primary mv-btn-lg max-w-full">Ver catálogo completo</Link>
                    )}
                    <a href="https://wa.me/558198143879" target="_blank" rel="noopener noreferrer"
                      className="mv-btn mv-btn-lg max-w-full bg-white/10 text-white border-white/20 hover:bg-white/15">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                      Falar com a loja
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setas + indicadores. Em telas pequenas ficam centrados na ARTE, logo
            abaixo do painel de texto; a partir de 1024px a arte começa na borda
            esquerda e eles voltam ao centro vertical do hero. */}
        {visiveis.length > 1 && (
          <>
            <button onClick={prev} aria-label="Banner anterior"
              className="absolute right-14 top-[110px] z-20 w-9 h-9 lg:right-auto lg:left-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-10 lg:h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={next} aria-label="Próximo banner"
              className="absolute right-3 top-[110px] z-20 w-9 h-9 lg:right-4 lg:top-1/2 lg:-translate-y-1/2 lg:w-10 lg:h-10 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {/* Cápsula escura atrás dos pontos: eles ficam legíveis tanto sobre
                arte clara quanto escura, sem depender do conteúdo do banner. */}
            <div className="absolute right-3 top-[112px] z-20 flex gap-1.5 px-2.5 py-2 rounded-full bg-black/35 backdrop-blur-sm lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:bottom-4 lg:top-auto">
              {visiveis.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)} aria-label={`Ir para o banner ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${i === current ? 'w-6 bg-[#e8991a]' : 'w-1.5 bg-white/60 hover:bg-white/85'}`} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
