import { useState, useEffect, useRef } from 'react'

interface TextoInlineProps {
  value: string
  onChange: (value: string) => void
  displayClassName?: string
}

// Texto clicável que vira campo de edição ao clicar (edição inline).
// Usado para renomear a descrição de um gasto sem apagar/recriar.
export function TextoInline({ value, onChange, displayClassName = '' }: TextoInlineProps) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editando) setRascunho(value) }, [editando, value])

  function confirmar() {
    const limpo = rascunho.trim()
    if (limpo && limpo !== value) onChange(limpo)
    setEditando(false)
  }

  if (editando) {
    return (
      <input
        ref={ref}
        autoFocus
        value={rascunho}
        onClick={e => e.stopPropagation()}
        onChange={e => setRascunho(e.target.value)}
        onBlur={confirmar}
        onKeyDown={e => {
          if (e.key === 'Enter') confirmar()
          if (e.key === 'Escape') setEditando(false)
        }}
        className="text-sm font-medium bg-white border border-saldo/60 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-saldo/20 w-full max-w-xs text-gray-800"
      />
    )
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditando(true) }}
      title="Clique para renomear"
      className={`text-left hover:opacity-70 transition-opacity ${displayClassName}`}
    >
      {value}
    </button>
  )
}
