import { Metadata } from 'next';
import MarcasVitrine from '@/components/vitrine/MarcasVitrine';

export const metadata: Metadata = {
  title: 'Marcas — Marquinho Moto Peças',
  description: 'Confira todas as marcas disponíveis em nossa loja de peças para motos.',
  alternates: { canonical: '/vitrine/marcas' },
};

export default function MarcasPage() {
  return <MarcasVitrine />;
}
