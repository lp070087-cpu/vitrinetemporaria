import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { normalizarSubcategoria, podeEditarPrecos } from '@/lib/peca-utils';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !['DONO', 'BALCAO', 'ESTOQUE'].includes(session.role)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
    }
    const { id } = await params;
    const peca = await prisma.peca.findUnique({
      where: { id, ativo: true },
      include: { categoria: { select: { nome: true, id: true, slug: true } } },
    });
    if (!peca) return NextResponse.json({ error: 'Peca nao encontrada' }, { status: 404 });
    return NextResponse.json(peca);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });

    // BALCAO NAO EDITA PRODUTO (AJUSTE 4). O perfil de balcao de venda pode
    // consultar, pesquisar, adicionar ao carrinho, vender e usar o PDV, mas nao
    // pode alterar nome/SKU/codigoBarras/categoria/subcategoria/marca/
    // compatibilidade nem excluir peca (DELETE tambem e DONO-only abaixo).
    // A edicao de peca permanece restrita a DONO e ESTOQUE.
    // Excecao permitida ao BALCAO: movimentar quantidade/estoque da loja
    // (mesma operacao que o fluxo de venda e o scanner ja fazem).
    const isBalcao = session.role === 'BALCAO';
    if (!['DONO', 'BALCAO', 'ESTOQUE'].includes(session.role)) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (isBalcao) {
      // Campos estruturais que o BALCAO nunca pode tocar nesta rota.
      const CAMPOS_ESTRUTURAIS = [
        'nome', 'codigo', 'codigoBarras', 'categoriaId', 'subcategoria',
        'marca', 'compatibilidade', 'descricao', 'descricaoCurta',
        'tamanho', 'genero', 'cor', 'localizacao', 'custoMedio',
      ];
      const tentouAlterar = CAMPOS_ESTRUTURAIS.filter(c => body[c] !== undefined);
      if (tentouAlterar.length > 0) {
        return NextResponse.json(
          { error: `Balcao nao pode alterar dados do produto (${tentouAlterar.join(', ')}). Procure a DONA ou o Estoque.` },
          { status: 403 }
        );
      }
      // BALCAO tambem nunca altera preco/custo (regra ja existente, mantida).
    }

    const existing = await prisma.peca.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Peça não encontrada' }, { status: 404 });

    const podePreco = podeEditarPrecos(session);

    const has = (v: unknown) => v !== undefined && v !== null;
    // Atualização parcial (BLOCO 10 — edição inline de preço): permite enviar
    // SOMENTE precoVenda/precoCusto sem nome. O cadastro completo continua
    // exigindo nome; um update sem nome e sem preço é ignorado.
    if (!has(body.nome) && !has(body.precoVenda) && !has(body.precoCusto) && !has(body.codigo)) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }
    const data: any = {
      nome: has(body.nome) ? body.nome : existing.nome,
      descricao: has(body.descricao) ? body.descricao : existing.descricao,
      codigo: has(body.codigo) ? body.codigo : existing.codigo,
      // Preservar campos opcionais quando o formulário não os enviar (nunca zerar).
      // Se o formulário enviar vazio explicitamente, limpa ('' → null).
      codigoBarras: has(body.codigoBarras) ? (body.codigoBarras || null) : existing.codigoBarras,
      localizacao: has(body.localizacao) ? (body.localizacao || null) : existing.localizacao,
      custoMedio: has(body.custoMedio) ? body.custoMedio : existing.custoMedio,
      quantidade: has(body.quantidade) ? body.quantidade : existing.quantidade,
      quantidadeLoja: has(body.quantidadeLoja) ? body.quantidadeLoja : existing.quantidadeLoja,
      estoqueMinimo: has(body.estoqueMinimo) ? body.estoqueMinimo : existing.estoqueMinimo,
      // Subcategoria: se enviada, normaliza sentinela "Sem subcategoria" → null; se ausente, preserva.
      subcategoria: has(body.subcategoria) ? normalizarSubcategoria(body.subcategoria) : existing.subcategoria,
      marca: has(body.marca) ? body.marca : existing.marca,
      compatibilidade: has(body.compatibilidade) ? body.compatibilidade : existing.compatibilidade,
      categoriaId: has(body.categoriaId) ? body.categoriaId : existing.categoriaId,
      // Tamanho/Gênero do acessório: se enviado, grava (ou limpa com ''); se ausente, preserva.
      tamanho: has(body.tamanho) ? (body.tamanho || null) : existing.tamanho,
      genero: has(body.genero) ? (body.genero || null) : existing.genero,
      // COR DO CAPACETE: mesmo padrão — se o formulário enviar, grava (vazio → null);
      // se NÃO enviar (undefined), preserva o valor existente (nunca apaga acidentalmente).
      cor: has(body.cor) ? (body.cor || null) : existing.cor,
    };

    // Preços: somente DONO/ESTOQUE podem alterar. BALCAO/MECANICO não.
    if (podePreco) {
      if (body.precoVenda !== undefined) data.precoVenda = body.precoVenda;
      if (body.precoCusto !== undefined) data.precoCusto = body.precoCusto;
    }

    const peca = await prisma.peca.update({
      where: { id },
      data,
      include: { categoria: { select: { nome: true, id: true, slug: true } } },
    });
    return NextResponse.json(peca);
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session || !['DONO'].includes(session.role)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
    const { id } = await params;
    await prisma.peca.update({ where: { id }, data: { ativo: false } });
    return NextResponse.json({ ok: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
