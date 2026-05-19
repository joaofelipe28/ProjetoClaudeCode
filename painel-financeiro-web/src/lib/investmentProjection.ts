import type { InvestimentoPosition, ProjectionPoint } from '@/types'

export function annualToMonthlyRate(taxaAnualPct: number): number {
  return Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1
}

export function projectSingle(
  saldoInicial: number,
  aporteMensal: number,
  taxaAnualPct: number,
  meses: number,
): ProjectionPoint[] {
  const taxaMensal = annualToMonthlyRate(taxaAnualPct)
  const points: ProjectionPoint[] = []
  let saldo = saldoInicial
  let totalInvestido = saldoInicial

  for (let m = 1; m <= meses; m++) {
    saldo = saldo * (1 + taxaMensal) + aporteMensal
    totalInvestido += aporteMensal
    const label = m % 12 === 0 ? `Ano ${m / 12}` : m === 1 ? 'Mês 1' : m % 6 === 0 ? `Mês ${m}` : ''
    points.push({ month: m, label, saldo, totalInvestido, rendimento: saldo - totalInvestido })
  }
  return points
}

export interface PositionProjection {
  position: InvestimentoPosition
  points: ProjectionPoint[]
  ano1: number
  ano3: number
  ano5: number
}

export function projectPortfolio(
  positions: InvestimentoPosition[],
  aporteMensalTotal: number,
  meses: number,
): ProjectionPoint[] {
  if (positions.length === 0) {
    return projectSingle(0, aporteMensalTotal, 10, meses)
  }
  const totalSaldo = positions.reduce((s, p) => s + p.saldoAtual, 0)

  // Simulate month-by-month across all positions
  const balances = positions.map(p => p.saldoAtual)
  const rates = positions.map(p => annualToMonthlyRate(p.taxaAnual))
  const points: ProjectionPoint[] = []
  let totalInvestido = totalSaldo

  for (let m = 1; m <= meses; m++) {
    let monthSaldo = 0
    // Distribute aporte pro-rata by current balance
    const currentTotal = balances.reduce((s, b) => s + b, 0)
    for (let i = 0; i < positions.length; i++) {
      const share = currentTotal > 0 ? balances[i] / currentTotal : 1 / positions.length
      const aporte = aporteMensalTotal * share
      balances[i] = balances[i] * (1 + rates[i]) + aporte
      monthSaldo += balances[i]
    }
    totalInvestido += aporteMensalTotal
    const label = m % 12 === 0 ? `Ano ${m / 12}` : m === 1 ? 'Mês 1' : m % 6 === 0 ? `Mês ${m}` : ''
    points.push({ month: m, label, saldo: monthSaldo, totalInvestido, rendimento: monthSaldo - totalInvestido })
  }
  return points
}

export function projectPosition(
  position: InvestimentoPosition,
  meses: number,
): PositionProjection {
  const points = projectSingle(position.saldoAtual, 0, position.taxaAnual, meses)
  return {
    position,
    points,
    ano1: points[11]?.saldo ?? 0,
    ano3: points[35]?.saldo ?? 0,
    ano5: points[59]?.saldo ?? 0,
  }
}

export function monthsToTarget(
  saldoAtual: number,
  aporteMensal: number,
  taxaAnualPct: number,
  saldoAlvo: number,
): number {
  if (saldoAtual >= saldoAlvo) return 0
  const taxaMensal = annualToMonthlyRate(taxaAnualPct)
  let saldo = saldoAtual
  let months = 0
  while (saldo < saldoAlvo && months < 600) {
    saldo = saldo * (1 + taxaMensal) + aporteMensal
    months++
  }
  return months
}
