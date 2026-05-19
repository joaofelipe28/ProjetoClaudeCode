import { useStore } from '@/store'
import { computeMonthSummary, computeDarf, computeFixosTotal } from '@/lib/calculations'
import { computeAllMonths } from '@/lib/calculations'

export function useMonthlyCalculations(mesAno: string) {
  const { config, tomadores, incomeRecords, fixos, pontuais, parcelamentos, aportes } = useStore()

  // Saldo anterior = sum of all previous months
  const allMonths = computeAllMonths(incomeRecords, tomadores, fixos, pontuais, parcelamentos, config, aportes)
  const idx = allMonths.findIndex(m => m.mesAno === mesAno)
  const saldoAnterior = idx > 0 ? allMonths[idx - 1].saldoAcumulado : config.saldoInicial

  const summary = computeMonthSummary(mesAno, incomeRecords, tomadores, fixos, pontuais, parcelamentos, config, saldoAnterior, aportes)

  // DARF breakdown para exibição da apuração do mês atual
  const monthRecords = incomeRecords.filter(r => r.mesAno === mesAno)
  const tomMap = Object.fromEntries(tomadores.map(t => [t.id, t]))
  const faturamentoPJ = monthRecords
    .filter(r => tomMap[r.tomadorId]?.tipo === 'PJ')
    .reduce((sum, r) => sum + r.valorRealizado, 0)
  const retencoesFonte = monthRecords.reduce((sum, r) => {
    const t = tomMap[r.tomadorId]
    if (!t || (!t.retemIss && !t.retemIrpj)) return sum
    const { taxConfig } = config
    let ret = 0
    if (t.retemIss) ret += r.valorRealizado * taxConfig.iss
    if (t.retemIrpj) ret += r.valorRealizado * (taxConfig.pis + taxConfig.cofins + taxConfig.irpj + taxConfig.csll)
    return sum + ret
  }, 0)
  // darf = breakdown do mês atual (apuração, para exibir os detalhes no card)
  const darf = computeDarf(faturamentoPJ, retencoesFonte, config, mesAno)
  // summary.darf já contém o DARF a pagar este mês (mês anterior) com timing correto

  const fixosTotal = computeFixosTotal(fixos)

  return { summary, darf, fixosTotal, monthRecords, saldoAnterior }
}

export function useAnnualProjection() {
  const { config, tomadores, incomeRecords, fixos, pontuais, parcelamentos, aportes } = useStore()
  return computeAllMonths(incomeRecords, tomadores, fixos, pontuais, parcelamentos, config, aportes)
}
