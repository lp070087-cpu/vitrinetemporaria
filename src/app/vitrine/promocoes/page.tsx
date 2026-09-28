import { Metadata } from 'next';
import PromocoesVitrine from '@/components/vitrine/PromocoesVitrine';

export const metadata: Metadata = {
  title: 'Promoções — Marquinho Moto Peças',
  description: 'Aproveite nossas ofertas exclusivas com descontos imperdíveis em peças para motos.',
  alternates: { canonical: '/vitrine/promocoes' },
};

export default function PromocoesPage() {
  return <PromocoesVitrine />;
}
