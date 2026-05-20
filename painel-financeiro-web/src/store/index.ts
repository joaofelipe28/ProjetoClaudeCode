import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type {
  AppConfig, TaxConfig, Tomador, MonthlyIncomeRecord, GastoFixo,
  GastoPontual, Parcelamento, InvestimentoPosition, InvestimentoHistorico,
  IncomeStatus, FixoStatus, ParcelamentoStatus, MonthlyDebitRecord, DebitStatus, DebitType,
  FixoCategoria, AporteInvestimento, ReceitaPontual,
} from '@/types'

// ── Seed Data ─────────────────────────────────────────────────────────────────

const DEFAULT_TAX: TaxConfig = { pis: 0.0065, cofins: 0.03, irpj: 0.048, csll: 0.0288, iss: 0.02 }

const DEFAULT_CONFIG: AppConfig = {
  saldoInicial: 690,
  provisaoFiscalAcumulada: 0,
  limiteAlerta: 0.9,
  reservaMesesAlvo: 3,
  taxConfig: DEFAULT_TAX,
  mesInicio: '2026-05',
  mesAtual: '2026-05',
}

function mkTomador(
  nome: string,
  tipo: 'PF' | 'PJ',
  retemIss: boolean,
  retemIrpj: boolean,
  tipoReceita: Tomador['tipoReceita'],
  valorPrevisto: number,
  isVariavel: boolean,
): Omit<Tomador, 'id'> {
  return { nome, tipo, retemIss, retemIrpj, tipoReceita, valorPrevisto, isVariavel, ativo: true }
}

const SEED_TOMADORES: Omit<Tomador, 'id'>[] = [
  mkTomador('SM24', 'PJ', false, false, 'Plantão', 25000, true),
  mkTomador('Amor Saúde', 'PJ', false, false, 'Consultório', 2500, true),
  mkTomador('PUCPR', 'PJ', false, false, 'Salário', 2000, true),
  mkTomador('Naturalles', 'PJ', true, true, 'Consultório', 1378, false),
  mkTomador('Facil Saúde', 'PJ', false, false, 'Plantão', 400, false),
  mkTomador('Bolsa Residência', 'PF', false, false, 'Salário', 4064, false),
  mkTomador('Jade Bordin', 'PF', false, false, 'Consultório', 0, true),
]

const SEED_FIXOS: Omit<GastoFixo, 'id'>[] = [
  { descricao: 'Parcela Carro (Nissan Kicks)', categoria: 'Transporte', valor: 1500, status: 'Ativo' },
  { descricao: 'Plano de Saúde', categoria: 'Saúde', valor: 952.30, status: 'Ativo' },
  { descricao: 'Psico João', categoria: 'Saúde mental', valor: 500, status: 'Ativo' },
  { descricao: 'Psico Mariana', categoria: 'Família', valor: 500, status: 'Ativo' },
  { descricao: 'Pix Mariana', categoria: 'Família', valor: 2000, status: 'Ativo' },
  { descricao: 'Contador', categoria: 'PJ operacional', valor: 699, status: 'Ativo' },
  { descricao: 'Condomínio', categoria: 'Moradia', valor: 700, status: 'Ativo' },
  { descricao: 'Luz', categoria: 'Moradia', valor: 250, status: 'Ativo' },
  { descricao: 'Telefone', categoria: 'Comunicação', valor: 450, status: 'Ativo' },
  { descricao: 'Claude', categoria: 'Trabalho/estudo', valor: 110, status: 'Ativo' },
  { descricao: 'Gympass', categoria: 'Bem-estar', valor: 400, status: 'Ativo' },
  { descricao: 'Ração Paçoca', categoria: 'Pet', valor: 200, status: 'Ativo' },
  { descricao: 'TV+Stream', categoria: 'Lazer', valor: 25, status: 'Ativo' },
]

const SEED_PARCELAMENTOS: Omit<Parcelamento, 'id'>[] = [
  { descricao: 'PGFN (Transação Dívida Ativa)', tipo: 'PJ', valorParcela: 757, totalParcelas: 120, mesInicio: '2026-04', status: 'Ativo' },
  { descricao: 'Cartão Itaú (Sônia)', tipo: 'Pessoal', categoria: 'Família', valorParcela: 4750, totalParcelas: 7, mesInicio: '2026-05', status: 'Ativo' },
  { descricao: 'Cartão Mari', tipo: 'Pessoal', categoria: 'Família', valorParcela: 7000, totalParcelas: 1, mesInicio: '2026-06', status: 'Ativo' },
]

// Predefined IDs for May 2026 pontuais so we can pre-seed payment status
const MP = {
  pai:          'seed-mai26-p01',
  rita:         'seed-mai26-p02',
  c6:           'seed-mai26-p03',
  nubank:       'seed-mai26-p04',
  churras:      'seed-mai26-p05',
  condAtras:    'seed-mai26-p06',
  contador:     'seed-mai26-p07',
  mercadoPago:  'seed-mai26-p08',
  santander:    'seed-mai26-p09',
  nubankJoao:   'seed-mai26-p10',
  dental:       'seed-mai26-p11',
  semParar:     'seed-mai26-p12',
  rafa:         'seed-mai26-p13',
}

function mk(id: string, descricao: string, categoria: FixoCategoria, valor: number, status: GastoPontual['status']): GastoPontual {
  return { id, mesAno: '2026-05', descricao, categoria, valor, status }
}

const SEED_PONTUAIS: GastoPontual[] = [
  mk(MP.pai,         'Pai',                    'Família',       3500,   'Previsto'),
  mk(MP.rita,        'Rita',                   'Família',       5751,   'Previsto'),
  mk(MP.c6,          'Cartão C6',              'Cartão',        1550,   'Confirmado'),
  mk(MP.nubank,      'Cartão Nubank',          'Cartão',        1992,   'Confirmado'),
  mk(MP.churras,     'Homenageados (Churras)', 'Lazer',          900,   'Confirmado'),
  mk(MP.condAtras,   'Condomínio atrasado',    'Moradia',       3450,   'Confirmado'),
  mk(MP.contador,    'Contador (extra)',        'PJ operacional',2000,   'Confirmado'),
  mk(MP.mercadoPago, 'Mercado Pago',           'Dívidas',        257,   'Confirmado'),
  mk(MP.santander,   'Santander CNPJ',         'Dívidas',        230,   'Confirmado'),
  mk(MP.nubankJoao,  'Nubank João',            'Dívidas',       115.72, 'Confirmado'),
  mk(MP.dental,      'DentalUni',              'Dívidas',         10,   'Confirmado'),
  mk(MP.semParar,    'Sem Parar',              'Dívidas',        278,   'Confirmado'),
  mk(MP.rafa,        'Rafa',                   'Família',       1600,   'Confirmado'),
]

// Pre-mark the 11 Confirmado pontuais as Pago in monthlyDebits
const PAID_MAI_IDS = [
  MP.c6, MP.nubank, MP.churras, MP.condAtras, MP.contador,
  MP.mercadoPago, MP.santander, MP.nubankJoao, MP.dental, MP.semParar, MP.rafa,
]
const SEED_MONTHLY_DEBITS: MonthlyDebitRecord[] = PAID_MAI_IDS.map((refId, i) => ({
  id: `seed-mdb-mai26-${i + 1}`,
  referenceId: refId,
  type: 'Pontual' as DebitType,
  mesAno: '2026-05',
  status: 'Pago' as DebitStatus,
  valorPago: SEED_PONTUAIS.find(p => p.id === refId)!.valor,
  dataPagamento: '2026-05-01',
}))

function withId<T>(items: Omit<T, 'id'>[]): T[] {
  return items.map(item => ({ ...item, id: crypto.randomUUID() }) as T)
}

// ── Store types ───────────────────────────────────────────────────────────────

interface AppStore {
  // State
  config: AppConfig
  tomadores: Tomador[]
  incomeRecords: MonthlyIncomeRecord[]
  monthlyDebits: MonthlyDebitRecord[]
  fixos: GastoFixo[]
  pontuais: GastoPontual[]
  parcelamentos: Parcelamento[]
  investimentos: InvestimentoPosition[]
  investimentoHistorico: InvestimentoHistorico[]
  aportes: AporteInvestimento[]
  receitasPontuais: ReceitaPontual[]

  // Config actions
  updateConfig: (updates: Partial<AppConfig>) => void
  updateTaxConfig: (updates: Partial<TaxConfig>) => void
  setMesAtual: (mes: string) => void

  // Tomadores actions
  addTomador: (t: Omit<Tomador, 'id'>) => void
  updateTomador: (id: string, updates: Partial<Tomador>) => void
  deleteTomador: (id: string) => void

  // Income actions
  upsertIncomeRecord: (record: Omit<MonthlyIncomeRecord, 'id'> & { id?: string }) => void
  updateIncomeStatus: (id: string, status: IncomeStatus) => void
  initMonthFromTomadores: (mesAno: string) => void

  // Fixos actions
  addFixo: (f: Omit<GastoFixo, 'id'>) => void
  updateFixo: (id: string, updates: Partial<GastoFixo>) => void
  deleteFixo: (id: string) => void
  updateFixoStatus: (id: string, status: FixoStatus) => void

  // Pontuais actions
  addPontual: (p: Omit<GastoPontual, 'id'>) => void
  updatePontual: (id: string, updates: Partial<GastoPontual>) => void
  deletePontual: (id: string) => void

  // Parcelamentos actions
  addParcelamento: (p: Omit<Parcelamento, 'id'>) => void
  updateParcelamento: (id: string, updates: Partial<Parcelamento>) => void
  deleteParcelamento: (id: string) => void
  updateParcelamentoStatus: (id: string, status: ParcelamentoStatus) => void

  // Investimentos actions
  addInvestimento: (inv: Omit<InvestimentoPosition, 'id'>) => void
  updateInvestimento: (id: string, updates: Partial<InvestimentoPosition>) => void
  deleteInvestimento: (id: string) => void
  addHistorico: (h: Omit<InvestimentoHistorico, 'id'>) => void
  updateHistorico: (id: string, updates: Partial<InvestimentoHistorico>) => void
  deleteHistorico: (id: string) => void

  // Aportes actions
  addAporte: (a: Omit<AporteInvestimento, 'id'>) => void
  updateAporte: (id: string, updates: Partial<AporteInvestimento>) => void
  deleteAporte: (id: string) => void

  // Receitas pontuais actions
  addReceitaPontual: (r: Omit<ReceitaPontual, 'id'>) => void
  updateReceitaPontual: (id: string, updates: Partial<ReceitaPontual>) => void
  deleteReceitaPontual: (id: string) => void

  // Monthly debits actions
  upsertDebitRecord: (ref: { referenceId: string; type: DebitType; mesAno: string; status: DebitStatus; valorPago: number; dataPagamento?: string }) => void
  toggleDebitPago: (referenceId: string, type: DebitType, mesAno: string, valorEsperado: number) => void
  getDebitRecord: (referenceId: string, mesAno: string) => MonthlyDebitRecord | undefined

  // Utility
  exportData: () => string
  importData: (json: string) => void
  resetToDefaults: () => void
}

// ── Default state ─────────────────────────────────────────────────────────────

function getDefaultState() {
  return {
    config: DEFAULT_CONFIG,
    tomadores: withId<Tomador>(SEED_TOMADORES),
    incomeRecords: [] as MonthlyIncomeRecord[],
    monthlyDebits: [...SEED_MONTHLY_DEBITS] as MonthlyDebitRecord[],
    fixos: withId<GastoFixo>(SEED_FIXOS),
    pontuais: [...SEED_PONTUAIS] as GastoPontual[],
    parcelamentos: withId<Parcelamento>(SEED_PARCELAMENTOS),
    investimentos: [] as InvestimentoPosition[],
    investimentoHistorico: [] as InvestimentoHistorico[],
    aportes: [] as AporteInvestimento[],
    receitasPontuais: [] as ReceitaPontual[],
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      ...getDefaultState(),

      updateConfig: (updates) => set(s => { Object.assign(s.config, updates) }),
      updateTaxConfig: (updates) => set(s => { Object.assign(s.config.taxConfig, updates) }),
      setMesAtual: (mes) => set(s => { s.config.mesAtual = mes }),

      addTomador: (t) => set(s => { s.tomadores.push({ ...t, id: crypto.randomUUID() }) }),
      updateTomador: (id, updates) => set(s => {
        const idx = s.tomadores.findIndex(t => t.id === id)
        if (idx !== -1) Object.assign(s.tomadores[idx], updates)
      }),
      deleteTomador: (id) => set(s => { s.tomadores = s.tomadores.filter(t => t.id !== id) }),

      upsertIncomeRecord: (record) => set(s => {
        const existing = s.incomeRecords.findIndex(
          r => r.tomadorId === record.tomadorId && r.mesAno === record.mesAno
        )
        if (existing !== -1) {
          Object.assign(s.incomeRecords[existing], record)
        } else {
          s.incomeRecords.push({ ...record, id: record.id ?? crypto.randomUUID() })
        }
      }),
      updateIncomeStatus: (id, status) => set(s => {
        const r = s.incomeRecords.find(r => r.id === id)
        if (r) r.status = status
      }),
      initMonthFromTomadores: (mesAno) => set(s => {
        const { tomadores, incomeRecords } = s
        tomadores.filter(t => t.ativo).forEach(t => {
          const exists = incomeRecords.some(r => r.tomadorId === t.id && r.mesAno === mesAno)
          if (!exists) {
            incomeRecords.push({
              id: crypto.randomUUID(),
              tomadorId: t.id,
              mesAno,
              valorPrevisto: t.valorPrevisto,
              valorRealizado: 0,
              status: 'Previsto',
            })
          }
        })
      }),

      addFixo: (f) => set(s => { s.fixos.push({ ...f, id: crypto.randomUUID() }) }),
      updateFixo: (id, updates) => set(s => {
        const idx = s.fixos.findIndex(f => f.id === id)
        if (idx !== -1) Object.assign(s.fixos[idx], updates)
      }),
      deleteFixo: (id) => set(s => { s.fixos = s.fixos.filter(f => f.id !== id) }),
      updateFixoStatus: (id, status) => set(s => {
        const f = s.fixos.find(f => f.id === id)
        if (f) f.status = status
      }),

      addPontual: (p) => set(s => { s.pontuais.push({ ...p, id: crypto.randomUUID() }) }),
      updatePontual: (id, updates) => set(s => {
        const idx = s.pontuais.findIndex(p => p.id === id)
        if (idx !== -1) Object.assign(s.pontuais[idx], updates)
      }),
      deletePontual: (id) => set(s => { s.pontuais = s.pontuais.filter(p => p.id !== id) }),

      addParcelamento: (p) => set(s => { s.parcelamentos.push({ ...p, id: crypto.randomUUID() }) }),
      updateParcelamento: (id, updates) => set(s => {
        const idx = s.parcelamentos.findIndex(p => p.id === id)
        if (idx !== -1) Object.assign(s.parcelamentos[idx], updates)
      }),
      deleteParcelamento: (id) => set(s => { s.parcelamentos = s.parcelamentos.filter(p => p.id !== id) }),
      updateParcelamentoStatus: (id, status) => set(s => {
        const p = s.parcelamentos.find(p => p.id === id)
        if (p) p.status = status
      }),

      upsertDebitRecord: (ref) => set(s => {
        const idx = s.monthlyDebits.findIndex(
          d => d.referenceId === ref.referenceId && d.mesAno === ref.mesAno
        )
        if (idx !== -1) {
          Object.assign(s.monthlyDebits[idx], ref)
        } else {
          s.monthlyDebits.push({ ...ref, id: crypto.randomUUID() })
        }
      }),
      toggleDebitPago: (referenceId, type, mesAno, valorEsperado) => set(s => {
        const idx = s.monthlyDebits.findIndex(
          d => d.referenceId === referenceId && d.mesAno === mesAno
        )
        if (idx !== -1) {
          const current = s.monthlyDebits[idx].status
          s.monthlyDebits[idx].status = current === 'Pago' ? 'Pendente' : 'Pago'
          if (s.monthlyDebits[idx].status === 'Pago') {
            s.monthlyDebits[idx].dataPagamento = new Date().toISOString().slice(0, 10)
          }
        } else {
          s.monthlyDebits.push({
            id: crypto.randomUUID(),
            referenceId, type, mesAno,
            status: 'Pago',
            valorPago: valorEsperado,
            dataPagamento: new Date().toISOString().slice(0, 10),
          })
        }
      }),
      getDebitRecord: (referenceId, mesAno) => {
        return get().monthlyDebits.find(d => d.referenceId === referenceId && d.mesAno === mesAno)
      },

      addInvestimento: (inv) => set(s => { s.investimentos.push({ ...inv, id: crypto.randomUUID() }) }),
      updateInvestimento: (id, updates) => set(s => {
        const idx = s.investimentos.findIndex(i => i.id === id)
        if (idx !== -1) Object.assign(s.investimentos[idx], updates)
      }),
      deleteInvestimento: (id) => set(s => { s.investimentos = s.investimentos.filter(i => i.id !== id) }),

      addHistorico: (h) => set(s => { s.investimentoHistorico.push({ ...h, id: crypto.randomUUID() }) }),
      updateHistorico: (id, updates) => set(s => {
        const idx = s.investimentoHistorico.findIndex(h => h.id === id)
        if (idx !== -1) Object.assign(s.investimentoHistorico[idx], updates)
      }),
      deleteHistorico: (id) => set(s => { s.investimentoHistorico = s.investimentoHistorico.filter(h => h.id !== id) }),

      addAporte: (a) => set(s => { s.aportes.push({ ...a, id: crypto.randomUUID() }) }),
      updateAporte: (id, updates) => set(s => {
        const idx = s.aportes.findIndex(a => a.id === id)
        if (idx !== -1) Object.assign(s.aportes[idx], updates)
      }),
      deleteAporte: (id) => set(s => { s.aportes = s.aportes.filter(a => a.id !== id) }),

      addReceitaPontual: (r) => set(s => { s.receitasPontuais.push({ ...r, id: crypto.randomUUID() }) }),
      updateReceitaPontual: (id, updates) => set(s => {
        const idx = s.receitasPontuais.findIndex(r => r.id === id)
        if (idx !== -1) Object.assign(s.receitasPontuais[idx], updates)
      }),
      deleteReceitaPontual: (id) => set(s => { s.receitasPontuais = s.receitasPontuais.filter(r => r.id !== id) }),

      exportData: () => {
        const { config, tomadores, incomeRecords, monthlyDebits, fixos, pontuais, parcelamentos, investimentos, investimentoHistorico, aportes, receitasPontuais } = get()
        return JSON.stringify({ config, tomadores, incomeRecords, monthlyDebits, fixos, pontuais, parcelamentos, investimentos, investimentoHistorico, aportes, receitasPontuais }, null, 2)
      },
      importData: (json) => set(s => {
        try {
          const data = JSON.parse(json)
          Object.assign(s, data)
        } catch {
          // ignore malformed
        }
      }),
      resetToDefaults: () => set(() => getDefaultState()),
    })),
    {
      name: 'painel-financeiro',
      // Storage customizado: se 'painel-financeiro' não existir, lê das chaves
      // legadas para migrar dados sem perda. Escreve sempre na chave canônica.
      storage: createJSONStorage(() => ({
        getItem: (key: string) => {
          const current = localStorage.getItem(key)
          if (current) return current
          for (const legacy of ['painel-financeiro-v2', 'painel-financeiro-v1']) {
            const old = localStorage.getItem(legacy)
            if (old) return old
          }
          return null
        },
        setItem: (key: string, value: string) => localStorage.setItem(key, value),
        removeItem: (key: string) => localStorage.removeItem(key),
      })),
      version: 4,
      // REGRA FUTURA: nunca mude o `name` acima. Para adicionar dados novos,
      // incremente `version` e escreva uma migração que só ADICIONA itens
      // ausentes por ID — nunca sobrescreva dados do usuário.
      migrate: (persistedState: unknown, fromVersion: number) => {
        const s = (persistedState ?? {}) as ReturnType<typeof getDefaultState> & { aportes?: AporteInvestimento[] }

        // v0/v1 → v2: adiciona pontuais e debits do seed de Mai/26
        if (fromVersion < 2) {
          const defaults = getDefaultState()

          const existingPIds = new Set((s.pontuais ?? []).map(p => p.id))
          const newP = defaults.pontuais.filter(p => !existingPIds.has(p.id))
          if (newP.length) s.pontuais = [...(s.pontuais ?? []), ...newP]

          const existingDIds = new Set((s.monthlyDebits ?? []).map(d => d.id))
          const newD = defaults.monthlyDebits.filter(d => !existingDIds.has(d.id))
          if (newD.length) s.monthlyDebits = [...(s.monthlyDebits ?? []), ...newD]
        }

        // v2 → v3: adiciona aportes
        if (fromVersion < 3) {
          if (!s.aportes) s.aportes = []
        }

        // v3 → v4: adiciona receitas pontuais
        if (fromVersion < 4) {
          if (!(s as any).receitasPontuais) (s as any).receitasPontuais = []
        }

        return s
      },
    }
  )
)
