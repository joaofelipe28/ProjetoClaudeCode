import type {
  AppConfig, Tomador, MonthlyIncomeRecord, GastoFixo,
  GastoPontual, Parcelamento, DarfCalculation, MonthSummary,
} from '@/types'
import { diffMonths, mesLabel, monthRange, addMonths } from './formatters'

// ── Tax / DARF ────────────────────────────────────────────────────────────────

export function computeRetencoes(tomador: Tomador, valor: number, config: AppConfig): number {
  if (!tomador.retemIss && !tomador.retemIrpj) return 0
  const { taxConfig } = config
  let total = 0
  if (tomador.retemIss) total += valor * taxConfig.iss
  if (tomador.retemIrpj) total += valor * (taxConfig.pis + taxConfig.cofins + taxConfig.irpj + taxConfig.csll)
  return total
}

export function computeDarf(
  faturamentoBruto: number,
  retencoesFonte: number,
  config: AppConfig,
  competencia: string,
): DarfCalculation {
  const { taxConfig } = config
  const pis = faturamentoBruto * taxConfig.pis
  const cofins = faturamentoBruto * taxConfig.cofins
  const irpj = faturamentoBruto * taxConfig.irpj
  const csll = faturamentoBruto * taxConfig.csll
  const iss = faturamentoBruto * taxConfig.iss
  const totalBruto = pis + cofins + irpj + csll + iss
  const darfAPagar = Math.max(0, totalBruto - retencoesFonte)
  return { competencia, faturamentoBruto, retencoes: retencoesFonte, pis, cofins, irpj, csll, iss, totalBruto, darfAPagar }
}

// ── Parcelamentos ─────────────────────────────────────────────────────────────

export function getParcelamentoValue(p: Parcelamento, mesAno: string): number {
  if (p.status !== 'Ativo') return 0
  const idx = diffMonths(p.mesInicio, mesAno)
  if (idx < 0 || idx >= p.totalParcelas) return 0
  return p.valorParcela
}

export function getParcelamentoMesFinal(p: Parcelamento): string {
  return addMonths(p.mesInicio, p.totalParcelas - 1)
}

export function getParcelamentoSaldoRestante(p: Parcelamento, mesAtual: string): number {
  const parcelasPagas = Math.max(0, Math.min(diffMonths(p.mesInicio, mesAtual), p.totalParcelas))
  return p.valorParcela * (p.totalParcelas - parcelasPagas)
}

// ── Monthly summary ───────────────────────────────────────────────────────────

export function computeMonthSummary(
  mesAno: string,
  incomeRecords: MonthlyIncomeRecord[],
  tomadores: Tomador[],
  fixos: GastoFixo[],
  pontuais: GastoPontual[],
  parcelamentos: Parcelamento[],
  config: AppConfig,
  saldoAnterior: number,
): MonthSummary {
  const tomMap = Object.fromEntries(tomadores.map(t => [t.id, t]))

  // Receitas
  const monthRecords = incomeRecords.filter(r => r.mesAno === mesAno)
  const receitaPrevista = tomadores.filter(t => t.ativo).reduce((sum, t) => sum + t.valorPrevisto, 0)
  const receitaRealizada = monthRecords.reduce((sum, r) => sum + r.valorRealizado, 0)

  // PJ faturamento (only PJ tomadores)
  const faturamentoPJ = monthRecords
    .filter(r => tomMap[r.tomadorId]?.tipo === 'PJ')
    .reduce((sum, r) => sum + r.valorRealizado, 0)
  const retencoesFonte = monthRecords.reduce((sum, r) => {
    const t = tomMap[r.tomadorId]
    return sum + (t ? computeRetencoes(t, r.valorRealizado, config) : 0)
  }, 0)
  const darf = computeDarf(faturamentoPJ, retencoesFonte, config, mesAno).darfAPagar

  // Fixos
  const fixos_ = fixos.filter(f => f.status === 'Ativo').reduce((sum, f) => sum + f.valor, 0)

  // Parcelamentos
  const parcelasTotal = parcelamentos.reduce((sum, p) => sum + getParcelamentoValue(p, mesAno), 0)

  // Pontuais
  const pontuais_ = pontuais
    .filter(p => p.mesAno === mesAno && p.status !== 'Cancelado')
    .reduce((sum, p) => sum + p.valor, 0)

  const totalDespesas = darf + fixos_ + parcelasTotal + pontuais_
  const saldoMes = receitaRealizada - totalDespesas
  const saldoAcumulado = saldoAnterior + saldoMes
  const pctComprometido = receitaRealizada > 0 ? totalDespesas / receitaRealizada : 0

  let status: MonthSummary['status'] = 'Saudável'
  if (pctComprometido > config.limiteAlerta) status = 'Crítico'
  else if (pctComprometido > 0.75) status = 'Alerta'

  return {
    mesAno,
    label: mesLabel(mesAno),
    receitaPrevista,
    receitaRealizada,
    fixos: fixos_,
    parcelasTotal,
    darf,
    pontuais: pontuais_,
    totalDespesas,
    saldoMes,
    saldoAcumulado,
    pctComprometido,
    status,
  }
}

export function computeAllMonths(
  incomeRecords: MonthlyIncomeRecord[],
  tomadores: Tomador[],
  fixos: GastoFixo[],
  pontuais: GastoPontual[],
  parcelamentos: Parcelamento[],
  config: AppConfig,
): MonthSummary[] {
  const meses = monthRange(config.mesInicio, addMonths(config.mesInicio, 7))
  const results: MonthSummary[] = []
  let saldoAnterior = config.saldoInicial
  for (const mes of meses) {
    const summary = computeMonthSummary(mes, incomeRecords, tomadores, fixos, pontuais, parcelamentos, config, saldoAnterior)
    results.push(summary)
    saldoAnterior = summary.saldoAcumulado
  }
  return results
}

export function computeFixosTotal(fixos: GastoFixo[]): number {
  return fixos.filter(f => f.status === 'Ativo').reduce((sum, f) => sum + f.valor, 0)
}

export function computeBreakEven(
  fixos: GastoFixo[],
  parcelamentos: Parcelamento[],
  mesAno: string,
  taxaEfetiva: number,
): number {
  const fixosTotal = computeFixosTotal(fixos)
  const parcelasTotal = parcelamentos.reduce((sum, p) => sum + getParcelamentoValue(p, mesAno), 0)
  return (fixosTotal + parcelasTotal) / Math.max(0.01, 1 - taxaEfetiva)
}
