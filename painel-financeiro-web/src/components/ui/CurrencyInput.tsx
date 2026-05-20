import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

export function CurrencyInput({ value, onChange, className = '', placeholder = 'R$ 0,00' }: CurrencyInputProps) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (value > 0) {
      setDisplay(value.toFixed(2).replace('.', ','))
    } else {
      setDisplay('')
    }
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9,]/g, '').replace(',', '.')
    setDisplay(e.target.value.replace(/[^0-9,]/g, ''))
    const num = parseFloat(raw)
    if (!isNaN(num)) onChange(num)
    else if (raw === '') onChange(0)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={`bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50 transition-colors ${className}`}
    />
  )
}
