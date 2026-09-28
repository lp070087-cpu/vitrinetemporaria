'use client';

import { useState, type ReactNode } from 'react';

export interface AbaProduto {
  id: string;
  rotulo: string;
  conteudo: ReactNode;
}

/**
 * Abas da página de produto.
 *
 * Antes, descrição/especificações/compatibilidade/frete/pagamento/avaliações/perguntas
 * eram SETE painéis empilhados — o produto terminava muito antes do fim da página e a
 * rolagem virava um corredor. Aqui os mesmos conteúdos ficam a um clique.
 *
 * O conteúdo chega já renderizado do servidor (props `conteudo`), então nada de dado
 * ou regra de negócio passa por este componente: ele só controla qual aba está visível.
 */
export default function AbasProduto({ abas }: { abas: AbaProduto[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.id ?? '');
  const atual = abas.find(a => a.id === ativa) ?? abas[0];

  if (!atual) return null;

  return (
    <div>
      {/* Barra de abas — rola na horizontal no celular em vez de quebrar em 3 linhas */}
      <div role="tablist" aria-label="Informações do produto"
        className="flex gap-1.5 overflow-x-auto pb-1 mb-5 border-b border-[var(--mv-line)]"
        style={{ scrollbarWidth: 'none' }}>
        {abas.map(a => {
          const on = a.id === atual.id;
          return (
            <button key={a.id} type="button" role="tab" aria-selected={on} aria-controls={`aba-${a.id}`}
              onClick={() => setAtiva(a.id)}
              className={`relative px-3.5 py-2.5 text-xs font-bold whitespace-nowrap transition-colors flex-none ${
                on ? 'text-[var(--mv-brand)]' : 'text-[var(--mv-text-3)] hover:text-[var(--mv-text)]'
              }`}>
              {a.rotulo}
              {/* Marcador: fica "dentro" da linha do container para não deslocar o layout */}
              <span className={`absolute left-2 right-2 -bottom-px h-0.5 rounded-full transition-colors ${on ? 'bg-[var(--mv-brand)]' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>

      <div id={`aba-${atual.id}`} role="tabpanel">
        {atual.conteudo}
      </div>
    </div>
  );
}
