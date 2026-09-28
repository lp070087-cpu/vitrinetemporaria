import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import { VITRINE_VISIBILITY, publicarPeca, WHATSAPP_LOJA, precoPublico, rotuloAtributosAcessorio } from '@/lib/vitrine-utils';
import CardProdutoPremium from '@/components/vitrine/CardProdutoPremium';
import GaleriaPremium from '@/components/vitrine/GaleriaPremium';
import AdicionarAoCarrinho from '@/components/vitrine/AdicionarAoCarrinho';
import AvaliacoesVitrine from '@/components/vitrine/AvaliacoesVitrine';
import PerguntasProduto from '@/components/vitrine/PerguntasProduto';
import FormasPagamento from '@/components/vitrine/FormasPagamento';
import FretePrazo from '@/components/vitrine/FretePrazo';
import CompartilharProduto from '@/components/vitrine/CompartilharProduto';
import RegistrarVisualizacao from '@/components/vitrine/RegistrarVisualizacao';
import AbasProduto from '@/components/vitrine/AbasProduto';

const fm = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const peca = await prisma.peca.findUnique({ where: { id }, include: { categoria: { select: { nome: true, slug: true } } } });
  if (!peca) return { title: 'Produto não encontrado' };
  return {
    title: `${peca.nome} — Marquinho Moto Peças`,
    description: peca.descricaoCurta || peca.descricao || `Compre ${peca.nome} na Marquinho Moto Peças`,
    alternates: { canonical: `/vitrine/produto/${peca.id}` },
    openGraph: peca.imagemUrl ? { images: [peca.imagemUrl] } : undefined,
    twitter: peca.imagemUrl ? { card: 'summary_large_image', images: [peca.imagemUrl] } : undefined,
  };
}

export default async function ProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const peca = await prisma.peca.findUnique({
    where: { id },
    include: {
      categoria: { select: { nome: true, slug: true } },
      imagens: { orderBy: { ordem: 'asc' } },
      documentos: true,
      compatibilidades: true,
    },
  });

  // Regra oficial: página 404 se o produto não atende aos critérios de visibilidade.
  const visivel = peca && peca.ativo && peca.quantidadeLoja > 0 && Number(peca.precoVenda) > 0;

  if (!peca || !visivel) {
    return (
      <div className="mv-container mv-section text-center">
        <div className="mv-empty !py-20">
          <h1 className="text-xl font-extrabold text-[var(--mv-text)]">Produto não encontrado</h1>
          <p className="text-sm text-[var(--mv-text-2)] mt-2 mb-5">
            Esta peça pode ter saído de linha ou estar sem estoque na loja.
          </p>
          <a href="/vitrine/catalogo" className="mv-btn mv-btn-primary">Ver o catálogo</a>
        </div>
      </div>
    );
  }

  const relacionados = await prisma.peca.findMany({
    where: { ...VITRINE_VISIBILITY, id: { not: peca.id }, categoriaId: peca.categoriaId },
    include: { categoria: { select: { nome: true, slug: true } } },
    take: 4,
  });

  const mesmaMarca = peca.marca ? await prisma.peca.findMany({
    where: { ...VITRINE_VISIBILITY, marca: peca.marca, id: { notIn: [peca.id, ...relacionados.map(r => r.id)] } },
    include: { categoria: { select: { nome: true, slug: true } } },
    take: 4,
  }) : [];

  const precoBase = Number(peca.precoVenda);
  // PREÇO PÚBLICO OFICIAL (item 6): precoVitrine (override DONA) > precoOferta > precoVenda.
  const precoAtual = precoPublico(peca);
  // Desconto exibido SEMPRE que o preço público for menor que o preço do estoque —
  // cobre tanto a oferta normal quanto o override da DONA via precoVitrine.
  const temDesconto = precoAtual > 0 && precoAtual < precoBase;
  const economia = temDesconto ? precoBase - precoAtual : 0;
  const desconto = temDesconto ? Math.round((economia / precoBase) * 100) : 0;
  const temPrecoVitrineDiferente = peca.precoVitrine != null && Number(peca.precoVitrine) !== precoBase;
  const disponivel = peca.quantidadeLoja > 0;
  const storeDomain = process.env.NEXT_PUBLIC_STORE_DOMAIN || 'vitrine.marquinhomotopecas.com';
  const baseUrl = `https://${storeDomain}`;
  const url = `${baseUrl}/vitrine/produto/${peca.id}`;
  const duvidasWhatsApp = `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(`Olá! Tenho uma dúvida sobre o produto ${peca.nome}.`)}`;

  // Garantia padrão
  const garantia = '3 meses de garantia contra defeitos de fabricação';

  const atributos = rotuloAtributosAcessorio(peca);

  /* ------------------------------------------------------------------ */
  /* CONTEÚDO DAS ABAS                                                   */
  /* ------------------------------------------------------------------ */

  const abaDescricao = (
    <div className="mv-panel">
      {peca.descricao ? (
        <p className="text-sm text-[var(--mv-text-2)] leading-relaxed whitespace-pre-line">{peca.descricao}</p>
      ) : (
        // AJUSTE 8: sem texto neutro inventando specs.
        <p className="text-sm text-[var(--mv-text-2)] leading-relaxed">
          Consulte a compatibilidade abaixo e a disponibilidade para a sua moto.
        </p>
      )}
    </div>
  );

  const abaEspecificacoes = (
    <div className="mv-panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0">
        <div className="mv-kv"><span>Marca</span><span>{peca.marca || '—'}</span></div>
        <div className="mv-kv"><span>Categoria</span><span>{peca.categoria.nome}</span></div>
        {atributos && (
          <div className="mv-kv">
            <span>{peca.genero ? 'Gênero / Tamanho' : 'Tamanho'}</span>
            <span>{atributos}</span>
          </div>
        )}
        {/* COR DO CAPACETE — só exibe a linha quando há cor cadastrada.
            null/vazio → nenhuma linha (nunca exibe "Cor:" vazia). */}
        {peca.cor && peca.cor.trim() ? (
          <div className="mv-kv"><span>Cor</span><span>{peca.cor.trim()}</span></div>
        ) : null}
        <div className="mv-kv"><span>Garantia</span><span>{garantia}</span></div>
        <div className="mv-kv">
          <span>Disponibilidade</span>
          <span className={disponivel ? 'text-[var(--mv-ok)]' : 'text-[var(--mv-alert)]'}>
            {disponivel ? 'Em estoque (retirada na loja)' : 'Indisponível'}
          </span>
        </div>
      </div>

      {peca.documentos.length > 0 && (
        <div className="mt-6 pt-5 border-t border-[var(--mv-line)]">
          <p className="mv-label">Documentos</p>
          <div className="flex flex-wrap gap-2">
            {peca.documentos.map(d => (
              <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                className="mv-btn mv-btn-ghost !text-xs">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3v5h5M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
                </svg>
                {d.nome}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const abaCompatibilidade = (
    <div className="mv-panel">
      {peca.compatibilidades?.length > 0 ? (
        <>
          <p className="text-xs text-[var(--mv-text-2)] mb-4">
            Esta peça foi cadastrada como compatível com os modelos abaixo.
          </p>
          <div className="flex flex-wrap gap-2">
            {peca.compatibilidades.map((c, i) => (
              <span key={i} className="mv-chip !cursor-default">
                <svg className="w-3.5 h-3.5 text-[var(--mv-brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {c.marca} {c.modelo}
                {c.anoInicial && ` ${c.anoInicial}`}{c.anoFinal && c.anoFinal !== c.anoInicial ? `–${c.anoFinal}` : ''}
                {c.motor && ` · ${c.motor}`}{c.versao && ` · ${c.versao}`}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[var(--mv-text-3)] mt-5">
            Na dúvida, confirme o modelo e o ano com a loja antes de comprar.
          </p>
        </>
      ) : (
        <p className="text-sm text-[var(--mv-text-2)]">
          Compatibilidade não informada no cadastro. Fale com a loja pelo WhatsApp que a gente confirma para a sua moto.
        </p>
      )}
    </div>
  );

  const abaEntrega = (
    <div className="flex flex-col gap-4">
      <div className="mv-panel">
        <FretePrazo pecaId={peca.id} />
      </div>
      <div className="mv-panel">
        <h2 className="mv-sec-title !text-base !pl-4 mb-4">Formas de pagamento</h2>
        <FormasPagamento preco={precoAtual} />
      </div>
    </div>
  );

  const abaAvaliacoes = (
    <div className="flex flex-col gap-4">
      <div className="mv-panel">
        <h2 className="mv-sec-title !text-base !pl-4 mb-4">Avaliações</h2>
        <AvaliacoesVitrine pecaId={peca.id} />
      </div>
      <div className="mv-panel">
        <h2 className="mv-sec-title !text-base !pl-4 mb-4">Perguntas e respostas</h2>
        <PerguntasProduto pecaId={peca.id} />
      </div>
    </div>
  );

  return (
    <div className="mv-container mv-section">
      {/* Registra visualização/histórico (componente invisível) */}
      <RegistrarVisualizacao pecaId={peca.id} />

      {/* MIGALHAS */}
      <nav className="mv-crumbs mb-5" aria-label="Você está aqui">
        <a href="/vitrine">Início</a>
        <span>/</span>
        <a href={`/vitrine/catalogo?categoria=${peca.categoria.slug}`}>{peca.categoria.nome}</a>
        <span>/</span>
        <span className="text-[var(--mv-text-2)] font-medium truncate max-w-[42ch]">{peca.nome}</span>
      </nav>

      {/* PRATO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">

        <div className="lg:sticky lg:top-[calc(var(--mv-header-total)+20px)] lg:z-30">
          <GaleriaPremium
            imagens={peca.imagens.map(i => ({ id: i.id, url: i.url, tipo: i.tipo, cor: i.cor || null }))}
            videos={peca.documentos.filter(d => d.tipo === 'VIDEO')}
            nome={peca.nome}
          />
        </div>

        <div>
          {peca.marca && (
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--mv-brand)] mb-2">{peca.marca}</p>
          )}
          <h1 className="text-2xl md:text-[1.75rem] font-extrabold text-[var(--mv-text)] tracking-tight leading-tight">
            {peca.nome}
          </h1>

          <div className="mt-3 mb-5">
            <CompartilharProduto nome={peca.nome} url={url} />
          </div>

          {/* PREÇO */}
          <div className="mv-panel mb-5">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl md:text-4xl font-extrabold text-[var(--mv-text)] tracking-tight">{fm(precoAtual)}</span>
              {(temDesconto || temPrecoVitrineDiferente) && <span className="mv-price-old !text-base">{fm(precoBase)}</span>}
              {temDesconto && <span className="mv-badge mv-badge-alert !text-xs !px-2.5 !py-1">-{desconto}%</span>}
            </div>

            {temDesconto && (
              <p className="text-sm font-bold text-[var(--mv-ok)] mt-2">Você economiza {fm(economia)}</p>
            )}
            {temPrecoVitrineDiferente && !temDesconto && (
              <p className="text-xs font-semibold text-[var(--mv-brand)] mt-2">
                Preço especial da Vitrine (preço na loja: {fm(precoBase)})
              </p>
            )}

            {/* Disponibilidade (sem expor estoque central) */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--mv-line)]">
              <span className={`w-2 h-2 rounded-full ${disponivel ? 'bg-[var(--mv-ok)]' : 'bg-[var(--mv-alert)]'}`} />
              <span className={`text-xs font-semibold ${disponivel ? 'text-[var(--mv-ok)]' : 'text-[var(--mv-alert)]'}`}>
                {disponivel ? 'Disponível para retirada na loja' : 'Indisponível no momento'}
              </span>
            </div>
          </div>

          {/* COMPRA — CTA em largura cheia da coluna: na página do produto o
              caminho de compra tem de ser o elemento mais evidente depois do preço. */}
          <div className="mb-4">
            <AdicionarAoCarrinho peca={publicarPeca(peca)} disponivel={disponivel} className="mv-btn-block" />
          </div>

          {/* DÚVIDAS NO WHATSAPP */}
          <a href={duvidasWhatsApp} target="_blank" rel="noopener noreferrer"
            className="mv-btn mv-btn-ghost mv-btn-block mb-5 !text-[var(--mv-ok)] !border-[var(--mv-ok-soft)]">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
            Dúvidas? Fale com a loja no WhatsApp
          </a>

          {/* GARANTIA */}
          <p className="text-[11px] text-[var(--mv-text-2)] flex items-start gap-2">
            <svg className="w-4 h-4 text-[var(--mv-brand)] flex-none mt-px" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {garantia}
          </p>
        </div>
      </div>

      {/* ABAS */}
      <section className="mt-12">
        <AbasProduto abas={[
          { id: 'descricao', rotulo: 'Descrição', conteudo: abaDescricao },
          { id: 'especificacoes', rotulo: 'Especificações', conteudo: abaEspecificacoes },
          { id: 'compatibilidade', rotulo: 'Compatibilidade', conteudo: abaCompatibilidade },
          { id: 'entrega', rotulo: 'Entrega e pagamento', conteudo: abaEntrega },
          { id: 'avaliacoes', rotulo: 'Avaliações e perguntas', conteudo: abaAvaliacoes },
        ]} />
      </section>

      {/* RELACIONADOS + MESMA MARCA
          Duas listas de grade completa em sequência davam à página do produto o
          mesmo rodapé monótono da home. Aqui as duas viram trilhos dentro de uma
          faixa única — o mesmo ritmo da home, com assinatura própria. */}
      {(relacionados.length > 0 || mesmaMarca.length > 0) && (
        <div className="mv-band">
          {relacionados.length > 0 && (
            <section className="mv-section">
              <div className="mv-sec-head">
                <div>
                  <h2 className="mv-sec-title">Produtos relacionados</h2>
                  <p className="mv-sec-sub">Da mesma categoria</p>
                </div>
                <a href={`/vitrine/catalogo?categoria=${peca.categoria.slug}`} className="mv-sec-link">
                  Ver categoria
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 5l7 7-7 7" /></svg>
                </a>
              </div>
              <div className="mv-carrossel">
                {relacionados.map(p => <CardProdutoPremium key={p.id} p={publicarPeca(p) as any} />)}
              </div>
            </section>
          )}

          {mesmaMarca.length > 0 && (
            <section className="mv-section">
              <div className="mv-sec-head">
                <div>
                  <h2 className="mv-sec-title">Mais da {peca.marca}</h2>
                  <p className="mv-sec-sub">Outros itens desta marca</p>
                </div>
              </div>
              <div className="mv-carrossel">
                {mesmaMarca.map(p => <CardProdutoPremium key={p.id} p={publicarPeca(p) as any} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
