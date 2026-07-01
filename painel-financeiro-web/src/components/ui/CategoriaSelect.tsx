import { useState } from 'react'

interface CategoriaSelectProps {
  value: string
  onChange: (value: string) => void
  categorias: string[]
  onCreate: (nome: string) => void
  className?: string
}

// Seletor de categoria com opção de criar uma nova na hora.
export function CategoriaSelect({ value, onChange, categorias, onCreate, className = '' }: CategoriaSelectProps) {
  const [criando, setCriando] = useState(false)
  const [nova, setNova] = useState('')

  function confirmarNova() {
    const limpo = nova.trim()
    if (!limpo) { setCriando(false); return }
    onCreate(limpo)
    onChange(limpo)
    setNova('')
    setCriando(false)
  }

  if (criando) {
    return (
      <div className={`flex gap-2 ${className}`}>
        <input
          type="text"
          autoFocus
          value={nova}
          onChange={e => setNova(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') confirmarNova(); if (e.key === 'Escape') setCriando(false) }}
          placeholder="Nome da categoria (ex: iFood)"
          className="flex-1 bg-white border border-saldo/60 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-saldo/20"
        />
        <button onClick={confirmarNova} className="px-3 py-2 rounded-lg bg-saldo text-white text-sm font-medium hover:bg-saldo/90">✓</button>
        <button onClick={() => { setCriando(false); setNova('') }} className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50">✕</button>
      </div>
    )
  }

  return (
    <select
      value={value}
      onChange={e => {
        if (e.target.value === '__nova__') { setCriando(true); return }
        onChange(e.target.value)
      }}
      className={`bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-saldo/60 transition-colors ${className}`}
    >
      {categorias.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
      <option value="__nova__">➕ Nova categoria…</option>
    </select>
  )
}
