import { useState, useEffect, useRef } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

export function CurrencyInput({ value, onChange, className = '', placeholder = 'R$ 0,00' }: CurrencyInputProps) {
  const [display, setDisplay] = useState('')
  const internalChange = useRef(false)

  useEffect(() => {
    if (internalChange.current) {
      internalChange.current = false
      return
    }
    setDisplay(value > 0 ? value.toFixed(2).replace('.', ',') : '')
  }, [value])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9,]/g, '').replace(',', '.')
    internalChange.current = true
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
      className={`bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-saldo/60 transition-colors ${className}`}
    />
  )
}
