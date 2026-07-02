import { useState } from 'react'
import { CurrencyInput } from './CurrencyInput'
import { brl } from '@/lib/formatters'

interface ValorInlineProps {
  value: number
  onChange: (value: number) => void
  displayClassName?: string   // estilo do texto quando não está editando (ex.: cor)
}

// Valor clicável que vira campo de edição ao clicar (edição inline).
// Usado nas linhas de gastos da aba Mensal para atualizar o valor sem apagar/recriar.
export function ValorInline({ value, onChange, displayClassName = '' }: ValorInlineProps) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <div onClick={e => e.stopPropagation()}>
        <CurrencyInput
          value={value}
          onChange={onChange}
          className="w-28 py-1 text-right"
          autoFocus
          onBlur={() => setEditando(false)}
          onEnter={() => setEditando(false)}
        />
      </div>
    )
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditando(true) }}
      title="Clique para editar o valor"
      className={`inline-flex items-center gap-1 hover:opacity-70 transition-opacity ${displayClassName}`}
    >
      {brl(value)} <span className="opacity-40 text-xs">✎</span>
    </button>
  )
}
