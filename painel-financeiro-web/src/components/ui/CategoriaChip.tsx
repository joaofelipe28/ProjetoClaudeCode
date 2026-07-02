import { useState } from 'react'
import { CategoriaSelect } from './CategoriaSelect'

interface CategoriaChipProps {
  value: string
  categorias: string[]
  onCreate: (nome: string) => void
  onChange: (value: string) => void
  prefix?: string   // texto opcional antes da categoria (ex.: "PJ")
}

// Categoria clicável que vira seletor ao clicar (edição inline).
// Usado nas linhas de gastos fixos, parcelamentos e pontuais da aba Mensal.
export function CategoriaChip({ value, categorias, onCreate, onChange, prefix }: CategoriaChipProps) {
  const [editando, setEditando] = useState(false)
  const temValor = !!value

  if (editando) {
    return (
      <div onClick={e => e.stopPropagation()} className="mt-1">
        <CategoriaSelect
          value={value || 'Outros'}
          categorias={categorias}
          onCreate={onCreate}
          onChange={v => { onChange(v); setEditando(false) }}
          className="text-xs"
        />
      </div>
    )
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditando(true) }}
      title="Clique para mudar a categoria"
      className="text-xs text-gray-400 hover:text-saldo inline-flex items-center gap-1 mt-0.5"
    >
      {prefix ? `${prefix} · ` : ''}{temValor ? value : 'definir categoria'} <span className="opacity-50">✎</span>
    </button>
  )
}
