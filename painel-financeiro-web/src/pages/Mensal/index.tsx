import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { useMonthlyCalculations } from '@/hooks/useMonthlyCalculations'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { brl, mesLabel, monthRange, addMonths } from '@/lib/formatters'
import { getParcelamentoValue, computeRetencoes } from '@/lib/calculations'
import type { IncomeStatus, GastoPontual, FixoCategoria } from '@/types'

const STATUS_OPTIONS = [
  { value: 'Previsto', label: 'Previsto' },
  { value: 'Pago', label: 'Pago' },
  { value: 'Pendente', label: 'Pendente' },
  { value: 'Cancelado', label: 'Cancelado' },
]

const CATEGORIA_OPTIONS: FixoCategoria[] = [
  'Alimentação', 'Bem-estar', 'Comunicação', 'Família', 'Lazer',
  'Moradia', 'Outros', 'Pet', 'PJ operacional', 'Saúde', 'Saúde mental',
  'Trabalho/estudo', 'Transporte',
]

export function Mensal() {
  const { config, tomadores, parcelamentos, pontuais, fixos,
    upsertIncomeRecord, initMonthFromTomadores, setMesAtual, addPontual, deletePontual } = useStore()

  const meses = monthRange(config.mesInicio, addMonths(config.mesInicio, 7))
  const [selectedMes, setSelectedMes] = useState(config.mesAtual)
  const [showAddPontual, setShowAddPontual] = useState(false)
  const [newPontual, setNewPontual] = useState<Partial<GastoPontual>>({
    mesAno: selectedMes, categoria: 'Outros', status: 'Confirmado',
  })

  const { summary, darf, monthRecords } = useMonthlyCalculations(selectedMes)

  useEffect(() => {
    initMonthFromTomadores(selectedMes)
    setMesAtual(selectedMes)
  }, [selectedMes])

  const tomMap = Object.fromEntries(tomadores.map(t => [t.id, t]))
  const activeParcelamentos = parcelamentos.filter(p => getParcelamentoValue(p, selectedMes) > 0)
  const monthPontuais = pontuais.filter(p => p.mesAno === selectedMes && p.status !== 'Cancelado')

  function handleValorChange(tomadorId: string, valor: number) {
    const existing = monthRecords.find(r => r.tomadorId === tomadorId)
    upsertIncomeRecord({
      id: existing?.id,
      tomadorId,
      mesAno: selectedMes,
      valorPrevisto: tomMap[tomadorId]?.valorPrevisto ?? 0,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Lançamento Mensal</h1>
        <p className="text-sm text-gray-400 mt-1">Registre as receitas recebidas no mês</p>
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
        <KpiCard title="% Comprometido" value={`${(summary.pctComprometido * 100).toFixed(0)}%`} color={summary.pctComprometido > 0.9 ? 'red' : summary.pctComprometido > 0.75 ? 'orange' : 'green'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue table */}
        <div className="lg:col-span-2 bg-surface border border-bdr rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bdr flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Receitas — {mesLabel(selectedMes)}</h2>
            <span className="text-xs text-gray-400">Clique no valor para editar</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  {['Tomador', 'Previsto', 'Realizado', 'Status', 'Retenção'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tomadores.filter(t => t.ativo).map(t => {
                  const rec = monthRecords.find(r => r.tomadorId === t.id)
                  const realizado = rec?.valorRealizado ?? 0
                  const retencao = computeRetencoes(t, realizado, config)
                  return (
                    <tr key={t.id} className="border-b border-bdr/50 hover:bg-white/5">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-200">{t.nome}</div>
                        <div className="text-xs text-gray-500">{t.tipo} · {t.tipoReceita}</div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{brl(t.valorPrevisto)}</td>
                      <td className="px-4 py-2.5">
                        <CurrencyInput
                          value={realizado}
                          onChange={v => handleValorChange(t.id, v)}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <Select
                          value={rec?.status ?? 'Previsto'}
                          onChange={v => handleStatusChange(t.id, v)}
                          options={STATUS_OPTIONS}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        {retencao > 0
                          ? <span className="text-darf text-xs font-medium">{brl(retencao)}</span>
                          : <span className="text-gray-600 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-surfaceAlt">
                  <td className="px-4 py-2.5 font-semibold text-gray-200" colSpan={2}>Total</td>
                  <td className="px-4 py-2.5 font-semibold text-receita">{brl(summary.receitaRealizada)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: DARF + Parcelas */}
        <div className="space-y-4">
          {/* DARF Card */}
          <div className="bg-surface border border-bdr rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-200 mb-3">DARF — {mesLabel(selectedMes)}</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Faturamento PJ</span><span>{brl(darf.faturamentoBruto)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">PIS (0.65%)</span><span>{brl(darf.pis)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">COFINS (3%)</span><span>{brl(darf.cofins)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">IRPJ (4.8%)</span><span>{brl(darf.irpj)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">CSLL (2.88%)</span><span>{brl(darf.csll)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">ISS (2%)</span><span>{brl(darf.iss)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Retenções fonte</span><span className="text-darf">-{brl(darf.retencoes)}</span></div>
              <div className="border-t border-bdr pt-2 flex justify-between font-semibold">
                <span className="text-gray-200">DARF a pagar</span>
                <span className="text-darf">{brl(darf.darfAPagar)}</span>
              </div>
            </div>
          </div>

          {/* Parcelamentos */}
          {activeParcelamentos.length > 0 && (
            <div className="bg-surface border border-bdr rounded-xl p-4">
              <h2 className="text-sm font-semibold text-gray-200 mb-3">Parcelamentos Ativos</h2>
              <div className="space-y-2">
                {activeParcelamentos.map(p => (
                  <div key={p.id} className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-300">{p.descricao}</div>
                      <div className="text-xs text-gray-500">{p.tipo}</div>
                    </div>
                    <span className={`text-sm font-medium ${p.tipo === 'PJ' ? 'text-pjParcela' : 'text-parcela'}`}>
                      {brl(getParcelamentoValue(p, selectedMes))}
                    </span>
                  </div>
                ))}
                <div className="border-t border-bdr pt-2 flex justify-between font-semibold text-sm">
                  <span className="text-gray-200">Total</span>
                  <span className="text-parcela">{brl(summary.parcelasTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Fixos summary */}
          <div className="bg-surface border border-bdr rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-200 mb-3">Gastos Fixos</h2>
            <div className="space-y-1.5">
              {fixos.filter(f => f.status === 'Ativo').slice(0, 6).map(f => (
                <div key={f.id} className="flex justify-between text-sm">
                  <span className="text-gray-400 truncate mr-2">{f.descricao}</span>
                  <span className="text-gray-300">{brl(f.valor)}</span>
                </div>
              ))}
              {fixos.filter(f => f.status === 'Ativo').length > 6 && (
                <div className="text-xs text-gray-500">+ {fixos.filter(f => f.status === 'Ativo').length - 6} outros</div>
              )}
              <div className="border-t border-bdr pt-2 flex justify-between font-semibold text-sm">
                <span className="text-gray-200">Total</span>
                <span className="text-despesa">{brl(summary.fixos)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos pontuais */}
      <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-bdr flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">Gastos Pontuais</h2>
          <button
            onClick={() => setShowAddPontual(true)}
            className="text-xs bg-saldo/20 text-saldo px-3 py-1.5 rounded-lg hover:bg-saldo/30 transition-colors"
          >
            + Adicionar
          </button>
        </div>
        {monthPontuais.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">Nenhum gasto pontual neste mês</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Descrição', 'Categoria', 'Valor', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthPontuais.map(p => (
                <tr key={p.id} className="border-b border-bdr/50 hover:bg-white/5">
                  <td className="px-4 py-2.5 text-gray-200">{p.descricao}</td>
                  <td className="px-4 py-2.5 text-gray-400">{p.categoria}</td>
                  <td className="px-4 py-2.5 font-medium text-pontual">{brl(p.valor)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => deletePontual(p.id)} className="text-gray-500 hover:text-despesa text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add pontual modal */}
      <Modal open={showAddPontual} onClose={() => setShowAddPontual(false)} title="Adicionar Gasto Pontual">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <input
              type="text"
              className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={newPontual.descricao ?? ''}
              onChange={e => setNewPontual(p => ({ ...p, descricao: e.target.value }))}
              placeholder="Ex: Consulta médica"
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
