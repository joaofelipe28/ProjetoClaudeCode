export function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function pct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function pctNum(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// "2026-05" → "Mai/26"
export function mesLabel(mesAno: string): string {
  const [year, month] = mesAno.split('-').map(Number)
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[month - 1]}/${String(year).slice(2)}`
}

// Generate list of mesAno strings from start to end (inclusive)
export function monthRange(start: string, end: string): string[] {
  const result: string[] = []
  let [y, m] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) {
    result.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return result
}

// Compare two mesAno strings
export function compareMes(a: string, b: string): number {
  return a.localeCompare(b)
}

// Add N months to mesAno
export function addMonths(mesAno: string, n: number): string {
  let [y, m] = mesAno.split('-').map(Number)
  m += n
  while (m > 12) { m -= 12; y++ }
  while (m < 1) { m += 12; y-- }
  return `${y}-${String(m).padStart(2, '0')}`
}

// Diff in months between two mesAno strings
export function diffMonths(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm)
}
