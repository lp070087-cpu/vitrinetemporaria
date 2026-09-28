import { Suspense } from 'react';
import VitrineHomeClient from './VitrineHomeClient';
import { Metadata } from 'next';
import { getCategoriasVitrine } from '@/lib/vitrine-utils';

export const metadata: Metadata = {
  title: 'Marquinho Moto Peças — Peças e Acessórios para Motos',
  description: 'Peças, acessórios, pneus e óleos para sua moto. Monte seu orçamento online e retire na loja. Atendimento rápido pelo WhatsApp.',
  alternates: { canonical: '/vitrine' },
  openGraph: { title: 'Marquinho Moto Peças', description: 'Peças e acessórios para sua moto com preços de atacado.' },
};

interface Categoria { id: string; nome: string; slug: string; subcategorias?: { nome: string; slug: string }[]; }
// Categoria vinda do endpoint 100% data-driven /api/vitrine/categorias (item 1).
// Já vem filtrada: só categorias com produtos visíveis (ativo && quantidadeLoja>0 && precoVenda>0),
// com totalProdutos e ordenadas por prioridade (CAPACETES → CAPAS → ACESSÓRIOS → alfabética).
interface CategoriaVitrine { id: string; nome: string; slug: string; icone?: string; totalProdutos: number; subcategorias: { nome: string; slug: string }[]; }
interface Peca {
  id: string; nome: string; codigo: string; precoVenda: number; precoOferta?: number; precoVitrine?: number;
  quantidadeLoja: number; destaque: boolean; oferta: boolean;
  marca?: string; compatibilidade?: string; imagemUrl?: string; descricaoCurta?: string;
  categoria: { nome: string; slug: string };
}

async function getVitrineData() {
  // AJUSTE 6 — FONTE ÚNICA DE VERDADE:
  //   • `categoriasVitrine` (menu + grid) vem do PRISMA DIRETO via getCategoriasVitrine()
  //     — a MESMA função da API /api/vitrine/categorias. Sem self-fetch HTTP, sem domínio
  //     com acento (IDN), sem variável não configurada. Elimina a causa raiz das categorias
  //     sumirem na Home em produção.
  //   • `pecas` (catálogo da Home) continua vindo da API pública /api/vitrine (leitura
  //     server-side; o self-fetch aqui é resiliente e não afeta o menu de categorias).
  try {
    const [pecasRes, categoriasVitrine] = await Promise.all([
      fetch(
        (process.env.NEXT_PUBLIC_BASE_URL || (process.env.NODE_ENV === 'production' ? 'https://marquinhomotopecas.com' : 'http://localhost:3000')) + '/api/vitrine',
        { cache: 'no-store' }
      ),
      getCategoriasVitrine(),
    ]);
    const pecas = ((await pecasRes.json()) as Peca[]) || [];
    // Fallback defensivo: categorias derivadas das peças (caso getCategoriasVitrine retorne []).
    const catsDerivadas = [...new Map(pecas.map((p: any) => [p.categoria.slug, p.categoria])).values()];
    return {
      pecas,
      categorias: catsDerivadas as Categoria[],
      categoriasVitrine: (Array.isArray(categoriasVitrine) ? categoriasVitrine : []) as CategoriaVitrine[],
    };
  } catch {
    return { pecas: [] as Peca[], categorias: [] as Categoria[], categoriasVitrine: [] as CategoriaVitrine[] };
  }
}

export default async function VitrineHome() {
  const { pecas, categorias, categoriasVitrine } = await getVitrineData();

  const vitrine = pecas;
  const destaques = vitrine.filter(p => p.destaque).slice(0, 8);
  // Oferta legada exibida na seção "Ofertas". Itens com preço exclusivo da Vitrine (precoVitrine)
  // não exibem o badge de oferta (o override prevalece) — por isso ficam de fora desta seção.
  const ofertas = vitrine.filter(p => p.oferta && p.precoOferta && p.precoVitrine == null).slice(0, 8);
  const lancamentos = [...vitrine].slice(0, 8);

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="mv-spin" /></div>}>
      <VitrineHomeClient
        destaques={destaques}
        ofertas={ofertas}
        lancamentos={lancamentos}
        pecas={vitrine}
        categorias={categorias}
        categoriasVitrine={categoriasVitrine}
      />
    </Suspense>
  );
}
