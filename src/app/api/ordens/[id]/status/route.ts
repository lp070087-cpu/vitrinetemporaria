import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { emitEvent } from '@/lib/event-bus';

// FASE 5 — Status válidos conforme enum StatusOS do Prisma
// LAVAGEM removido da lista de status válidos (BLOCO 8) — não pode mais ser
// escolhido em NOVAS OS. O enum Prisma NÃO foi alterado, então OS antigas com
// status LAVAGEM continuam legíveis e intocadas no Neon.
const STATUS_VALIDOS = ['ABERTA', 'EM_ANDAMENTO', 'AGUARDANDO_PECAS', 'PRONTA', 'CONCLUIDA', 'CANCELADA', 'AGUARDANDO_MECANICO', 'EM_SERVICO', 'TESTE'];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !['DONO', 'BALCAO'].includes(session.role)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, mecanicoId, diagnostico, valorMaoDeObra, statusPagamento, valorPago, formaPagamento, dataPagamento,
      garantiaDias, dataAgendamento, horaAgendamento, previsaoEntrega, kmAtual, tempoEstimado } = body;
    const data: any = {};
    if (status !== undefined) {
      // FASE 5 — validar status contra o enum StatusOS do Prisma
      if (!STATUS_VALIDOS.includes(status)) {
        return NextResponse.json({ error: `Status invalido: ${status}. Valores permitidos: ${STATUS_VALIDOS.join(', ')}` }, { status: 400 });
      }
      data.status = status;
    }
    if (mecanicoId !== undefined) data.mecanicoId = mecanicoId;
    if (diagnostico !== undefined) data.diagnostico = diagnostico;

    // Pagamento: DONO e BALCAO podem marcar como PAGO
    // BALCAO pode marcar como AGUARDANDO_PAGAMENTO (finalizar servico) e ENTREGUE (liberar moto)
    if (statusPagamento === 'PAGO' && !['DONO', 'BALCAO'].includes(session.role)) {
      return NextResponse.json({ error: 'Apenas Dono ou Balcao pode marcar como PAGO.' }, { status: 403 });
    }
    if (statusPagamento !== undefined) {
      data.statusPagamento = statusPagamento;
      if (statusPagamento === 'PAGO') {
        data.dataPagamento = dataPagamento ? new Date(dataPagamento) : new Date();
        data.usuarioPagamento = session.name;
        data.valorPago = valorPago !== undefined ? valorPago : undefined;
        data.formaPagamento = formaPagamento || null;
      }
      // Quando Balcao finaliza servico, registrar data e responsavel
      if (statusPagamento === 'AGUARDANDO_PAGAMENTO') {
        data.finalizadoEm = new Date();
        data.finalizadoPor = session.name;
      }
      // Quando Balcao (ou qualquer um) entrega a moto
      if (statusPagamento === 'ENTREGUE') {
        data.finalizadoEm = data.finalizadoEm || new Date();
      }
    }
    if (valorPago !== undefined) data.valorPago = valorPago;

    // FASE 15-F: Oficina Premium fields
    if (garantiaDias !== undefined) {
      data.garantiaDias = garantiaDias;
      // Calcular garantiaAte baseado na data de pagamento
      if (garantiaDias > 0 && dataPagamento) {
        const dt = new Date(dataPagamento);
        dt.setDate(dt.getDate() + garantiaDias);
        data.garantiaAte = dt;
      } else if (garantiaDias > 0) {
        // Se nao tem dataPagamento explicita, usa hoje (OS ja estava paga)
        const dt = new Date();
        dt.setDate(dt.getDate() + garantiaDias);
        data.garantiaAte = dt;
      }
    }
    if (dataAgendamento !== undefined) data.dataAgendamento = dataAgendamento ? new Date(dataAgendamento) : null;
    if (horaAgendamento !== undefined) data.horaAgendamento = horaAgendamento;
    if (previsaoEntrega !== undefined) data.previsaoEntrega = previsaoEntrega ? new Date(previsaoEntrega) : null;
    if (kmAtual !== undefined) data.kmAtual = kmAtual;
    if (tempoEstimado !== undefined) data.tempoEstimado = tempoEstimado;

    // `valorMaoDeObra === undefined` (e não truthiness): salvar R$ 0,00 é uma
    // alteração válida e não pode cair em "Nada para atualizar".
    if (Object.keys(data).length === 0 && valorMaoDeObra === undefined && garantiaDias === undefined && !dataAgendamento && !previsaoEntrega && !kmAtual && tempoEstimado === undefined) {
      return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 });
    }

    // Transação atômica: ler itens + atualizar OS + criar historico
    const os = await prisma.$transaction(async (tx) => {
      if (valorMaoDeObra !== undefined) {
        // Coerce explícito para número decimal (aceita string "150,00" → 150 e
        // number). Valor inválido é tratado como 0. Mantém o schema Decimal.
        const maoDeObraNum = Number(String(valorMaoDeObra).replace(',', '.'));
        const maoDeObraValido = Number.isFinite(maoDeObraNum) ? Math.max(0, maoDeObraNum) : 0;
        const itens = await tx.itemOS.findMany({ where: { ordemServicoId: id } });
        const valorPecas = itens.reduce((sum, i) => sum + Number(i.precoUnitario) * i.quantidade, 0);
        data.valorMaoDeObra = maoDeObraValido;
        // FONTE ÚNICA DE VERDADE: total = peças + mão de obra (não soma desconto,
        // que é um campo separado exibido apenas na impressão).
        data.valorTotal = Math.round((valorPecas + maoDeObraValido) * 100) / 100;
      }
      if (Object.keys(data).length === 0) throw new Error('Nada para atualizar');

      const updated = await tx.ordemServico.update({
        where: { id }, data,
        include: { mecanico: { select: { name: true } }, balcao: { select: { name: true } }, itens: { include: { peca: true } } },
      });

      // Criar HistoricoOS para transições de status (só quando houver mudança
      // real de status/pagamento — uma atualização só de mão de obra não pode
      // gravar "Status alterado para undefined").
      const tipoHist: Record<string, string> = {
        PAGO: 'PAGAMENTO',
        ENTREGUE: 'ENTREGA',
        AGUARDANDO_PAGAMENTO: 'FINALIZACAO',
        EM_ANDAMENTO: 'MUDANCA_STATUS',
        CANCELADA: 'MUDANCA_STATUS',
      };
      const tipoH = tipoHist[statusPagamento || status || ''] || 'MUDANCA_STATUS';

      if (statusPagamento || status) {
        await tx.historicoOS.create({
          data: {
            ordemServicoId: id,
            tipo: tipoH,
            descricao: statusPagamento
              ? `Status de pagamento alterado para ${statusPagamento}${statusPagamento === 'PAGO' ? ` — R$ ${Number(valorPago || 0).toFixed(2)}` : ''}`
              : `Status alterado para ${status}${mecanicoId ? ' (mecanico alterado)' : ''}`,
            usuario: session.name,
            usuarioId: session.id,
          },
        });
      }

      // Historico dedicado para a alteração da mão de obra (fonte do total).
      if (valorMaoDeObra !== undefined) {
        await tx.historicoOS.create({
          data: {
            ordemServicoId: id,
            tipo: 'MUDANCA_STATUS',
            descricao: `Mão de obra atualizada para R$ ${Number(data.valorMaoDeObra ?? 0).toFixed(2)}`,
            usuario: session.name,
            usuarioId: session.id,
          },
        });
      }

      // FASE 15-F: Historico para alteracoes de agendamento e garantia
      if (garantiaDias !== undefined) {
        await tx.historicoOS.create({
          data: {
            ordemServicoId: id,
            tipo: 'MUDANCA_STATUS',
            descricao: `Garantia definida para ${garantiaDias} dias`,
            usuario: session.name,
            usuarioId: session.id,
          },
        });
      }
      if (dataAgendamento || horaAgendamento) {
        await tx.historicoOS.create({
          data: {
            ordemServicoId: id,
            tipo: 'MUDANCA_STATUS',
            descricao: `Agendamento: ${dataAgendamento ? new Date(dataAgendamento).toLocaleDateString('pt-BR') : ''} ${horaAgendamento || ''}`,
            usuario: session.name,
            usuarioId: session.id,
          },
        });
      }

      return updated;
    });

    // FASE 15-J: Emitir eventos de mudança de status da OS
    const statusToEventOS: Record<string, any> = {
      AGUARDANDO_PAGAMENTO: { tipo: 'OS_FINALIZADA' as any, origem: 'OFICINA' as any },
      PAGO: { tipo: 'OS_PAGA' as any, origem: 'OFICINA' as any },
    };
    const evtKey = statusPagamento || '';
    const evtOS = statusToEventOS[evtKey];
    if (evtOS) {
      emitEvent({
        ...evtOS,
        entidadeTipo: 'OrdemServico',
        entidadeId: String(os.numero),
        usuarioId: session.id,
        payload: { numero: os.numero, cliente: os.nomeCliente, status: evtKey, operador: session.name },
      });
    }

    return NextResponse.json(os);
  } catch (e: any) {
    if (e?.message === 'Nada para atualizar') return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('Erro ao atualizar status da OS:', e);
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
  }
}
