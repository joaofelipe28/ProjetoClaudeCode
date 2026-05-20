import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { useMonthlyCalculations } from '@/hooks/useMonthlyCalculations'
import { KpiCard } from '@/components/ui/KpiCard'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { brl, mesLabel, monthRange, addMonths } from '@/lib/formatters'
import { getParcelamentoValue } from '@/lib/calculations'
import type { IncomeStatus, GastoPontual, FixoCategoria, DebitType, AporteInvestimento } from '@/types'

const STATUS_OPTIONS = [
  { value: 'Previsto', label: 'Previsto' },
  { value: 'Pago', label: 'Pago' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Cancelado', label: 'Cancelado' },
]

const CATEGORIA_OPTIONS: FixoCategoria[] = [
  'Alimentação', 'Bem-estar', 'Cartão', 'Comunicação', 'Dívidas', 'Família', 'Lazer',
  'Moradia', 'Outros', 'Pet', 'PJ operacional', 'Saúde', 'Saúde mental',
  'Trabalho/estudo', 'Transporte',
]

const TYPE_COLOR: Record<DebitType, string> = {
  Fixo: 'bg-despesa/20 text-despesa',
  Parcelamento: 'bg-parcela/20 text-parcela',
  Pontual: 'bg-pontual/20 text-pontual',
  DARF: 'bg-darf/20 text-darf',
  Aporte: 'bg-saldo/20 text-saldo',
}

function CheckCircle({ checked }: { checked: boolean }) {
  return (
    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
      checked
        ? 'bg-receita border-receita'
        : 'border-gray-600 hover:border-saldo'
    }`}>
      {checked && (
        <svg viewBox="0 0 12 10" className="w-3.5 h-3.5 fill-gray-900">
          <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export function Mensal() {
  const {
    config, tomadores, parcelamentos, pontuais, fixos, investimentos, aportes,
    upsertIncomeRecord, initMonthFromTomadores, setMesAtual,
    addPontual, deletePontual,
    addAporte, deleteAporte,
    toggleDebitPago, getDebitRecord,
  } = useStore()

  const meses = monthRange(config.mesInicio, addMonths(config.mesInicio, 7))
  const [selectedMes, setSelectedMes] = useState(config.mesAtual)
  const [showAddPontual, setShowAddPontual] = useState(false)
  const [newPontual, setNewPontual] = useState<Partial<GastoPontual>>({
    mesAno: selectedMes, categoria: 'Outros', status: 'Confirmado',
  })
  const [showAddAporte, setShowAddAporte] = useState(false)
  const [newAporte, setNewAporte] = useState<Partial<AporteInvestimento>>({
    mesAno: selectedMes, status: 'Confirmado', valor: 0,
  })

  const { summary, darf, monthRecords } = useMonthlyCalculations(selectedMes)

  useEffect(() => {
    initMonthFromTomadores(selectedMes)
    setMesAtual(selectedMes)
  }, [selectedMes])

  const tomMap = Object.fromEntries(tomadores.map(t => [t.id, t]))
  const activeParcelamentos = parcelamentos.filter(p => getParcelamentoValue(p, selectedMes) > 0)
  const monthPontuais = pontuais.filter(p => p.mesAno === selectedMes && p.status !== 'Cancelado')
  const activeFixos = fixos.filter(f => f.status === 'Ativo')
  const monthAportes = aportes.filter(a => a.mesAno === selectedMes && a.status !== 'Cancelado')
  const invMap = Object.fromEntries(investimentos.map(i => [i.id, i]))

  // ── DARF timing: computeMonthSummary já retorna timing correto ────────────
  // summary.darf  = DARF a pagar este mês (calculado sobre receita do mês anterior)
  // darf (hook)   = DarfCalculation do mês atual (breakdown para exibição da apuração)
  const prevMes = addMonths(selectedMes, -1)
  const nextMes = addMonths(selectedMes, 1)
  const prevDarfKey = `darf-${prevMes}`
  const prevDarfValor = summary.darf  // já calculado corretamente no core

  // Debit payment helpers
  function isDebitPago(referenceId: string) {
    const rec = getDebitRecord(referenceId, selectedMes)
    return rec?.status === 'Pago'
  }

  function handleToggle(referenceId: string, type: DebitType, valor: number) {
    toggleDebitPago(referenceId, type, selectedMes, valor)
  }

  const prevDarfPago = isDebitPago(prevDarfKey)

  // Totals paid vs pending for debits (DARF = mês anterior, pago este mês)
  const allDebitItems = [
    ...activeFixos.map(f => ({ id: f.id, valor: f.valor, type: 'Fixo' as DebitType })),
    ...activeParcelamentos.map(p => ({ id: p.id, valor: getParcelamentoValue(p, selectedMes), type: 'Parcelamento' as DebitType })),
    ...monthPontuais.map(p => ({ id: p.id, valor: p.valor, type: 'Pontual' as DebitType })),
    ...(prevDarfValor > 0 ? [{ id: prevDarfKey, valor: prevDarfValor, type: 'DARF' as DebitType }] : []),
    ...monthAportes.map(a => ({ id: a.id, valor: a.valor, type: 'Aporte' as DebitType })),
  ]
  const totalPago = allDebitItems.filter(d => isDebitPago(d.id)).reduce((s, d) => s + d.valor, 0)
  const totalPendente = allDebitItems.filter(d => !isDebitPago(d.id)).reduce((s, d) => s + d.valor, 0)
  const countPago = allDebitItems.filter(d => isDebitPago(d.id)).length

  // ── Receita parcial já recebida ────────────────────────────────────────────
  const receitaJaPaga = monthRecords
    .filter(r => r.status === 'Pago')
    .reduce((s, r) => s + r.valorRealizado, 0)
  const receitaFaltaReceber = tomadores.filter(t => t.ativo).reduce((s, t) => {
    const rec = monthRecords.find(r => r.tomadorId === t.id)
    if (rec?.status === 'Pago' || rec?.status === 'Cancelado') return s
    const valor = rec && rec.valorRealizado > 0 ? rec.valorRealizado : (rec?.valorPrevisto ?? t.valorPrevisto)
    return s + valor
  }, 0)
  const receitaPrevistoTotal = tomadores.filter(t => t.ativo).reduce((s, t) => {
    const rec = monthRecords.find(r => r.tomadorId === t.id)
    return s + (rec?.valorPrevisto ?? t.valorPrevisto)
  }, 0)

  function handlePrevisoChange(tomadorId: string, valor: number) {
    const existing = monthRecords.find(r => r.tomadorId === tomadorId)
    upsertIncomeRecord({
      id: existing?.id,
      tomadorId,
      mesAno: selectedMes,
      valorPrevisto: valor,
      valorRealizado: existing?.valorRealizado ?? 0,
      status: (existing?.status ?? 'Previsto') as IncomeStatus,
    })
  }

  function handleValorChange(tomadorId: string, valor: number) {
    const existing = monthRecords.find(r => r.tomadorId === tomadorId)
    upsertIncomeRecord({
      id: existing?.id,
      tomadorId,
      mesAno: selectedMes,
      valorPrevisto: existing?.valorPrevisto ?? tomMap[tomadorId]?.valorPrevisto ?? 0,
      valorRealizado: valor,
      status: (existing?.status ?? 'Previsto') as IncomeStatus,
    })
  }

  function handleStatusChange(tomadorId: string, status: string) {
    const existing = monthRecords.find(r => r.tomadorId === tomadorId)
    if (!existing) return
    upsertIncomeRecord({ ...existing, status: status as IncomeStatus })
  }

  function handleAddPontual() {
    if (!newPontual.descricao || !newPontual.valor) return
    addPontual({
      mesAno: selectedMes,
      descricao: newPontual.descricao!,
      categoria: newPontual.categoria as FixoCategoria,
      valor: newPontual.valor!,
      status: 'Confirmado',
    })
    setNewPontual({ mesAno: selectedMes, categoria: 'Outros', status: 'Confirmado' })
    setShowAddPontual(false)
  }

  function handleAddAporte() {
    if (!newAporte.investimentoId || !newAporte.valor) return
    addAporte({
      mesAno: selectedMes,
      investimentoId: newAporte.investimentoId!,
      valor: newAporte.valor!,
      status: 'Confirmado',
    })
    setNewAporte({ mesAno: selectedMes, status: 'Confirmado', valor: 0 })
    setShowAddAporte(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Lançamento Mensal</h1>
        <p className="text-sm text-gray-400 mt-1">Registre receitas e marque contas pagas</p>
      </div>

      {/* Month selector */}
      <div className="flex flex-wrap gap-2">
        {meses.map(m => (
          <button
            key={m}
            onClick={() => setSelectedMes(m)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              m === selectedMes ? 'bg-saldo text-gray-900' : 'bg-surfaceAlt text-gray-400 hover:text-gray-200 border border-bdr'
            }`}
          >
            {mesLabel(m)}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Receita Realizada" value={brl(summary.receitaRealizada)} color="green" />
        <KpiCard title="Total Despesas" value={brl(summary.totalDespesas)} color="red" />
        <KpiCard title="Saldo do Mês" value={brl(summary.saldoMes)} color={summary.saldoMes >= 0 ? 'teal' : 'red'} />
        <KpiCard
          title="Contas Pagas"
          value={`${countPago}/${allDebitItems.length}`}
          subtitle={`${brl(totalPago)} de ${brl(totalPago + totalPendente)}`}
          color={countPago === allDebitItems.length ? 'green' : 'orange'}
          icon={countPago === allDebitItems.length ? '✅' : '⏳'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Receitas ─────────────────────────────────────────────────────── */}
        <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bdr flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">📥 Receitas — {mesLabel(selectedMes)}</h2>
            <span className="text-xs text-gray-500">Clique no valor para editar</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Tomador', 'Previsto', 'Realizado', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tomadores.filter(t => t.ativo).map(t => {
                const rec = monthRecords.find(r => r.tomadorId === t.id)
                const realizado = rec?.valorRealizado ?? 0
                return (
                  <tr key={t.id} className="border-b border-bdr/50 hover:bg-white/5">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-200 text-sm">{t.nome}</div>
                      <div className="text-xs text-gray-500">{t.tipo}</div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-sm">{brl(t.valorPrevisto)}</td>
                    <td className="px-4 py-2.5">
                      <CurrencyInput value={realizado} onChange={v => handleValorChange(t.id, v)} className="w-28" />
                    </td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={rec?.status ?? 'Previsto'}
                        onChange={v => handleStatusChange(t.id, v)}
                        options={STATUS_OPTIONS}
                        className="w-28"
                      />
                    </td>
                  </tr>
                )
              })}
              <tr className="bg-surfaceAlt">
                <td className="px-4 py-2.5 font-semibold text-gray-200 text-sm" colSpan={2}>Total Realizado</td>
                <td className="px-4 py-2.5 font-semibold text-receita text-sm">{brl(summary.receitaRealizada)}</td>
                <td />
              </tr>
            </tbody>
          </table>
          {/* Saldo parcial já recebido */}
          <div className="px-4 py-3 border-t border-bdr bg-surfaceAlt/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Já recebido (Pago)</span>
              <span className="font-semibold text-receita">{brl(receitaJaPaga)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">A receber (previsto)</span>
              <span className="text-gray-300">{brl(receitaPrevistaPendente)}</span>
            </div>
            {summary.receitaPrevista > 0 && (
              <div className="space-y-1">
                <div className="w-full bg-bdr rounded-full h-1.5">
                  <div
                    className="bg-receita h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (receitaJaPaga / summary.receitaPrevista) * 100)}%` }}
                  />
                </div>
                <div className="text-right text-xs text-gray-500">
                  {((receitaJaPaga / summary.receitaPrevista) * 100).toFixed(0)}% de {brl(summary.receitaPrevista)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── DARF ──────────────────────────────────────────────────────────── */}
        <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bdr">
            <h2 className="text-sm font-semibold text-gray-200">🏛️ DARF — {mesLabel(selectedMes)}</h2>
          </div>

          {/* Seção 1: Apuração do mês atual (referência – vence no próximo mês) */}
          <div className="px-4 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-darf/80 uppercase tracking-wide">
                Apuração {mesLabel(selectedMes)}
              </span>
              <span className="text-xs text-gray-500 bg-darf/10 px-2 py-0.5 rounded-full">
                Vence em {mesLabel(nextMes)}
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Faturamento PJ</span><span className="text-gray-300">{brl(darf.faturamentoBruto)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">PIS (0.65%)</span><span className="text-gray-400">{brl(darf.pis)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">COFINS (3%)</span><span className="text-gray-400">{brl(darf.cofins)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">IRPJ (4.8%)</span><span className="text-gray-400">{brl(darf.irpj)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">CSLL (2.88%)</span><span className="text-gray-400">{brl(darf.csll)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-gray-500">ISS (2%)</span><span className="text-gray-400">{brl(darf.iss)}</span></div>
              {darf.retencoes > 0 && (
                <div className="flex justify-between text-xs"><span className="text-gray-500">Retenções fonte</span><span className="text-darf">-{brl(darf.retencoes)}</span></div>
              )}
              <div className="border-t border-bdr/60 pt-1.5 flex justify-between font-semibold">
                <span className="text-gray-300 text-sm">Total apurado</span>
                <span className="text-darf/80 text-sm">{brl(darf.darfAPagar)}</span>
              </div>
            </div>
          </div>

          {/* Seção 2: DARF a pagar este mês (calculado sobre receitas do mês anterior) */}
          <div className="mx-4 mt-3 mb-3 rounded-lg border border-darf/30 bg-darf/5 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-darf uppercase tracking-wide">
                  DARF a pagar este mês
                </div>
                <div className="text-xs text-gray-500 mt-0.5">ref. {mesLabel(prevMes)}</div>
              </div>
              {prevDarfValor > 0 ? (
                <button
                  onClick={() => handleToggle(prevDarfKey, 'DARF', prevDarfValor)}
                  className="flex items-center gap-2"
                >
                  <CheckCircle checked={prevDarfPago} />
                  <div className="text-right">
                    <div className={`text-sm font-bold ${prevDarfPago ? 'line-through text-gray-500' : 'text-darf'}`}>
                      {brl(prevDarfValor)}
                    </div>
                    <div className={`text-xs ${prevDarfPago ? 'text-receita' : 'text-gray-500'}`}>
                      {prevDarfPago ? 'Pago ✓' : 'Clique para marcar pago'}
                    </div>
                  </div>
                </button>
              ) : (
                <span className="text-xs text-gray-500 italic">Nenhum DARF a pagar</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contas do Mês (Checklist de Débitos) ─────────────────────────── */}
      <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-bdr flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-200">📋 Contas do Mês — {mesLabel(selectedMes)}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Clique no círculo para marcar como pago</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-receita font-medium">✓ {brl(totalPago)} pago</span>
            <span className="text-gray-400">{brl(totalPendente)} pendente</span>
            <button
              onClick={() => setShowAddPontual(true)}
              className="bg-saldo/20 text-saldo px-3 py-1.5 rounded-lg hover:bg-saldo/30 transition-colors"
            >
              + Adicionar conta
            </button>
          </div>
        </div>

        <div className="divide-y divide-bdr/40">
          {/* Fixos */}
          {activeFixos.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-despesa/5">
                <span className="text-xs font-semibold text-despesa uppercase tracking-wide">Gastos Fixos</span>
              </div>
              {activeFixos.map(f => {
                const pago = isDebitPago(f.id)
                return (
                  <div
                    key={f.id}
                    onClick={() => handleToggle(f.id, 'Fixo', f.valor)}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <CheckCircle checked={pago} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium transition-colors ${pago ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {f.descricao}
                      </div>
                      <div className="text-xs text-gray-500">{f.categoria}</div>
                    </div>
                    <div className={`text-sm font-medium ${pago ? 'text-gray-500 line-through' : 'text-despesa'}`}>
                      {brl(f.valor)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR['Fixo']}`}>Fixo</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Parcelamentos */}
          {activeParcelamentos.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-parcela/5">
                <span className="text-xs font-semibold text-parcela uppercase tracking-wide">Parcelamentos</span>
              </div>
              {activeParcelamentos.map(p => {
                const valor = getParcelamentoValue(p, selectedMes)
                const pago = isDebitPago(p.id)
                return (
                  <div
                    key={p.id}
                    onClick={() => handleToggle(p.id, 'Parcelamento', valor)}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <CheckCircle checked={pago} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium transition-colors ${pago ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {p.descricao}
                      </div>
                      <div className="text-xs text-gray-500">{p.tipo}</div>
                    </div>
                    <div className={`text-sm font-medium ${pago ? 'text-gray-500 line-through' : p.tipo === 'PJ' ? 'text-pjParcela' : 'text-parcela'}`}>
                      {brl(valor)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR['Parcelamento']}`}>Parcela</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* DARF no checklist (refere-se ao mês anterior — vence este mês) */}
          {prevDarfValor > 0 && (
            <div>
              <div className="px-4 py-2 bg-darf/5">
                <span className="text-xs font-semibold text-darf uppercase tracking-wide">Impostos</span>
              </div>
              <div
                onClick={() => handleToggle(prevDarfKey, 'DARF', prevDarfValor)}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors"
              >
                <CheckCircle checked={prevDarfPago} />
                <div className="flex-1">
                  <div className={`text-sm font-medium ${prevDarfPago ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    DARF — ref. {mesLabel(prevMes)}
                  </div>
                  <div className="text-xs text-gray-500">Vence em {mesLabel(selectedMes)} · PIS + COFINS + IRPJ + CSLL + ISS</div>
                </div>
                <div className={`text-sm font-medium ${prevDarfPago ? 'text-gray-500 line-through' : 'text-darf'}`}>
                  {brl(prevDarfValor)}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR['DARF']}`}>DARF</span>
              </div>
            </div>
          )}

          {/* Pontuais */}
          <div>
            <div className="px-4 py-2 bg-pontual/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-pontual uppercase tracking-wide">Gastos Pontuais</span>
            </div>
            {monthPontuais.length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                Nenhum gasto pontual — <button onClick={() => setShowAddPontual(true)} className="text-saldo hover:underline">adicionar</button>
              </div>
            ) : (
              monthPontuais.map(p => {
                const pago = isDebitPago(p.id)
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div onClick={() => handleToggle(p.id, 'Pontual', p.valor)} className="cursor-pointer">
                      <CheckCircle checked={pago} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${pago ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {p.descricao}
                      </div>
                      <div className="text-xs text-gray-500">{p.categoria}</div>
                    </div>
                    <div className={`text-sm font-medium ${pago ? 'text-gray-500 line-through' : 'text-pontual'}`}>
                      {brl(p.valor)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR['Pontual']}`}>Pontual</span>
                    <button
                      onClick={() => deletePontual(p.id)}
                      className="text-gray-600 hover:text-despesa text-xs ml-1"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Aportes */}
          <div>
            <div className="px-4 py-2 bg-saldo/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-saldo uppercase tracking-wide">Aportes de Investimento</span>
              <button
                onClick={() => setShowAddAporte(true)}
                className="text-xs bg-saldo/20 text-saldo px-2 py-1 rounded-lg hover:bg-saldo/30 transition-colors"
              >
                + Novo aporte
              </button>
            </div>
            {monthAportes.length === 0 ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                {investimentos.length === 0
                  ? 'Cadastre uma posição em Investimentos primeiro'
                  : <button onClick={() => setShowAddAporte(true)} className="text-saldo hover:underline">Registrar aporte deste mês</button>
                }
              </div>
            ) : (
              monthAportes.map(a => {
                const inv = invMap[a.investimentoId]
                const pago = isDebitPago(a.id)
                return (
                  <div
                    key={a.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div onClick={() => handleToggle(a.id, 'Aporte', a.valor)} className="cursor-pointer">
                      <CheckCircle checked={pago} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${pago ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {inv?.nome ?? 'Investimento removido'}
                      </div>
                      <div className="text-xs text-gray-500">{a.mesAno}</div>
                    </div>
                    <div className={`text-sm font-medium ${pago ? 'text-gray-500 line-through' : 'text-saldo'}`}>
                      {brl(a.valor)}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLOR['Aporte']}`}>Aporte</span>
                    <button
                      onClick={() => deleteAporte(a.id)}
                      className="text-gray-600 hover:text-despesa text-xs ml-1"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Summary footer */}
          <div className="px-4 py-3 bg-surfaceAlt flex items-center justify-between">
            <div className="text-sm">
              <span className="text-gray-400">Total despesas: </span>
              <span className="font-semibold text-gray-200">{brl(summary.totalDespesas)}</span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-receita font-medium">✓ {brl(totalPago)} pago</span>
              {totalPendente > 0 && <span className="text-alerta font-medium">⏳ {brl(totalPendente)} pendente</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Add aporte modal */}
      <Modal open={showAddAporte} onClose={() => setShowAddAporte(false)} title="Registrar Aporte de Investimento">
        <div className="space-y-4">
          {investimentos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Cadastre uma posição em Investimentos primeiro</p>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Posição (Investimento)</label>
                <Select
                  value={newAporte.investimentoId ?? ''}
                  onChange={v => setNewAporte(a => ({ ...a, investimentoId: v }))}
                  options={[{ value: '', label: 'Selecione...' }, ...investimentos.map(i => ({ value: i.id, label: i.nome }))]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Valor do aporte</label>
                <CurrencyInput
                  value={newAporte.valor ?? 0}
                  onChange={v => setNewAporte(a => ({ ...a, valor: v }))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddAporte(false)} className="flex-1 px-4 py-2 rounded-lg border border-bdr text-gray-400 text-sm hover:text-gray-200 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleAddAporte} className="flex-1 px-4 py-2 rounded-lg bg-saldo text-gray-900 font-medium text-sm hover:bg-saldo/90 transition-colors">
                  Registrar
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Add pontual modal */}
      <Modal open={showAddPontual} onClose={() => setShowAddPontual(false)} title="Adicionar Conta / Gasto Pontual">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <input
              type="text"
              className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={newPontual.descricao ?? ''}
              onChange={e => setNewPontual(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: Consulta médica, IPVA, presente..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Categoria</label>
            <Select
              value={newPontual.categoria ?? 'Outros'}
              onChange={v => setNewPontual(p => ({ ...p, categoria: v as FixoCategoria }))}
              options={CATEGORIA_OPTIONS.map(c => ({ value: c, label: c }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Valor</label>
            <CurrencyInput
              value={newPontual.valor ?? 0}
              onChange={v => setNewPontual(p => ({ ...p, valor: v }))}
              className="w-full"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowAddPontual(false)} className="flex-1 px-4 py-2 rounded-lg border border-bdr text-gray-400 text-sm hover:text-gray-200 transition-colors">
              Cancelar
            </button>
            <button onClick={handleAddPontual} className="flex-1 px-4 py-2 rounded-lg bg-saldo text-gray-900 font-medium text-sm hover:bg-saldo/90 transition-colors">
              Adicionar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
