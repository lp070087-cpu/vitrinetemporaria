import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './vitrine.css';
import VitrineHeader from '@/components/vitrine/VitrineHeader';
import RodapePremium from '@/components/vitrine/RodapePremium';

/**
 * Tipografia da loja — Inter via next/font (self-hosted pelo build, sem CDN em runtime).
 * A variável CSS `--mv-font` é consumida só por `.mv-scope` (vitrine.css), então as
 * áreas internas (DONA/BALCÃO/ESTOQUE) mantêm a fonte que já usavam.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--mv-font',
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_STORE_DOMAIN
    ? new URL(`https://${process.env.NEXT_PUBLIC_STORE_DOMAIN}`)
    : new URL('http://localhost:3000'),
  title: 'Marquinho Moto Peças — Peças e Acessórios para Motos',
  description: 'Peças, acessórios, pneus e óleos para sua moto. Monte seu orçamento online e retire na loja. Atendimento rápido pelo WhatsApp.',
  alternates: { canonical: '/vitrine' },
  openGraph: {
    title: 'Marquinho Moto Peças — Peças e Acessórios para Motos',
    description: 'Peças, acessórios, pneus e óleos para sua moto. Monte seu orçamento online e retire na loja. Atendimento rápido pelo WhatsApp.',
    siteName: 'Marquinho Moto Peças',
    locale: 'pt_BR',
    type: 'website',
  },
};

export const viewport: Viewport = { themeColor: '#0b1220', width: 'device-width', initialScale: 1 };

/**
 * Layout da VITRINE PÚBLICA.
 *
 * Cabeçalho e rodapé vivem AQUI (antes eram repetidos, cada um com seu próprio
 * markup, em 9 arquivos diferentes). Centralizar dá um só lugar para a identidade
 * visual e evita que a loja pareça "montada por partes".
 *
 * Todo o CSS novo é escopado em `.mv-scope` (prefixo `.mv-*`), importado apenas
 * por este layout — por isso o redesign não alcança /dono, /balcao nem /estoque.
 */
export default function VitrineLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mv-scope ${inter.variable} min-h-screen`}>
      <VitrineHeader />
      <main className="min-h-[60vh]">{children}</main>
      <RodapePremium />
    </div>
  );
}
