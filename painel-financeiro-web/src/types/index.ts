// ── Config ────────────────────────────────────────────────────────────────────

export interface TaxConfig {
  pis: number
  cofins: number
  irpj: number
  csll: number
  iss: number
}

export interface AppConfig {
  saldoInicial: number
  provisaoFiscalAcumulada: number
  limiteAlerta: number
  reservaMesesAlvo: number
  taxConfig: TaxConfig
  mesInicio: string
  mesAtual: string
}

// ── Tomadores ─────────────────────────────────────────────────────────────────

export type TomadorTipo = 'PF' | 'PJ'
export type TomadorTipoReceita = 'Plantão' | 'Consultório' | 'Salário' | 'Outros'

export interface Tomador {
  id: string
  nome: string
  tipo: TomadorTipo
  retemIss: boolean
  retemIrpj: boolean
  tipoReceita: TomadorTipoReceita
  valorPrevisto: number
  isVariavel: boolean
  ativo: boolean
  obs?: string
}

// ── Income Records ────────────────────────────────────────────────────────────

export type IncomeStatus = 'Pago' | 'Previsto' | 'Pendente' | 'Cancelado'

export interface MonthlyIncomeRecord {
  id: string
  tomadorId: string
  mesAno: string
  valorPrevisto: number
  valorRealizado: number
  status: IncomeStatus
  dataRecebimento?: string
  obs?: string
}

// ── Monthly Debit Records ─────────────────────────────────────────────────────

export type DebitStatus = 'Pago' | 'Pendente' | 'Agendado' | 'Pulado'
export type DebitType = 'Fixo' | 'Parcelamento' | 'Pontual' | 'DARF' | 'Aporte'

export interface MonthlyDebitRecord {
  id: string
  referenceId: string   // fixoId, parcelamentoId, pontualId, or 'darf'
  type: DebitType
  mesAno: string
  status: DebitStatus
  valorPago: number
  dataPagamento?: string
}

// ── Gastos Fixos ──────────────────────────────────────────────────────────────

export type FixoCategoria =
  | 'Transporte'
  | 'Saúde'
  | 'Saúde mental'
  | 'Família'
  | 'PJ operacional'
  | 'Moradia'
  | 'Comunicação'
  | 'Trabalho/estudo'
  | 'Bem-estar'
  | 'Pet'
  | 'Lazer'
  | 'Alimentação'
  | 'Cartão'
  | 'Dívidas'
  | 'Outros'

export type FixoStatus = 'Ativo' | 'Pausado' | 'Cancelado'

export interface GastoFixo {
  id: string
  descricao: string
  categoria: FixoCategoria
  valor: number
  status: FixoStatus
  obs?: string
}

// ── Gastos Pontuais ───────────────────────────────────────────────────────────

export type PontualStatus = 'Confirmado' | 'Previsto' | 'Cancelado'

export interface GastoPontual {
  id: string
  mesAno: string
  descricao: string
  categoria: FixoCategoria
  valor: number
  status: PontualStatus
  data?: string
}

// ── Parcelamentos ─────────────────────────────────────────────────────────────

export type ParcelamentoTipo = 'PJ' | 'Pessoal'
export type ParcelamentoStatus = 'Ativo' | 'Quitado' | 'Suspenso'

export interface Parcelamento {
  id: string
  descricao: string
  tipo: ParcelamentoTipo
  categoria?: FixoCategoria
  valorParcela: number
  totalParcelas: number
  mesInicio: string
  status: ParcelamentoStatus
  obs?: string
}

// ── Aportes de Investimento ───────────────────────────────────────────────────

export interface AporteInvestimento {
  id: string
  mesAno: string
  investimentoId: string
  valor: number
  status: 'Confirmado' | 'Previsto' | 'Cancelado'
  obs?: string
}

// ── Investimentos ─────────────────────────────────────────────────────────────

export type InvestimentoTipo =
  | 'Tesouro Direto'
  | 'CDB'
  | 'LCI'
  | 'LCA'
  | 'Poupança'
  | 'FII'
  | 'Ação'
  | 'ETF'
  | 'Outros'

export type InvestimentoLiquidez = 'Diária' | 'No vencimento' | '30 dias' | '60 dias' | '90 dias' | '180 dias' | '360 dias+'

export type InvestimentoTaxaTipo = 'Prefixado' | 'CDI+' | 'IPCA+' | '% CDI'

export type AlocacaoTipo = 'Renda Fixa Longo' | 'Renda Fixa Curto' | 'Renda Variável'

export interface InvestimentoPosition {
  id: string
  nome: string
  tipo: InvestimentoTipo
  instituicao: string
  taxaAnual: number
  taxaTipo: InvestimentoTaxaTipo
  valorAplicado: number
  saldoAtual: number
  vencimento?: string
  liquidez: InvestimentoLiquidez
  alocacao: AlocacaoTipo
  obs?: string
}

export interface InvestimentoHistorico {
  id: string
  mesAno: string
  aporte: number
  saldoFinal: number
  rentabilidadePct: number
  obs?: string
}

// ── Receitas Pontuais ─────────────────────────────────────────────────────────

export interface ReceitaPontual {
  id: string
  mesAno: string
  descricao: string
  valor: number
  status: PontualStatus
}

// ── Computed types ────────────────────────────────────────────────────────────

export interface MonthSummary {
  mesAno: string
  label: string
  receitaPrevista: number
  receitaRealizada: number
  fixos: number
  parcelasTotal: number
  darf: number        // DARF a pagar este mês (calculado sobre receita do mês anterior)
  darfApurado: number // Apuração do mês atual (vence no mês seguinte, informacional)
  pontuais: number
  aportes: number
  totalDespesas: number
  saldoMes: number
  saldoAcumulado: number
  pctComprometido: number
  status: 'Saudável' | 'Alerta' | 'Crítico'
}

export interface DarfCalculation {
  competencia: string
  faturamentoBruto: number
  retencoes: number
  pis: number
  cofins: number
  irpj: number
  csll: number
  iss: number
  totalBruto: number
  darfAPagar: number
}

export interface ProjectionPoint {
  month: number
  label: string
  saldo: number
  totalInvestido: number
  rendimento: number
}
