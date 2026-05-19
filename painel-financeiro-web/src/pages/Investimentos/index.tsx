import { useState } from 'react'
import { useStore } from '@/store'
import { KpiCard } from '@/components/ui/KpiCard'
import { Modal } from '@/components/ui/Modal'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Select } from '@/components/ui/Select'
import { brl, pctNum } from '@/lib/formatters'
import { projectSingle, projectPortfolio, projectPosition } from '@/lib/investmentProjection'
import type { InvestimentoPosition, InvestimentoTipo, InvestimentoLiquidez, InvestimentoTaxaTipo, AlocacaoTipo } from '@/types'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts'

const TIPO_OPTIONS: InvestimentoTipo[] = ['Tesouro Direto', 'CDB', 'LCI', 'LCA', 'Poupança', 'FII', 'Ação', 'ETF', 'Outros']
const LIQUIDEZ_OPTIONS: InvestimentoLiquidez[] = ['Diária', 'No vencimento', '30 dias', '60 dias', '90 dias', '180 dias', '360 dias+']
const TAXA_TIPO_OPTIONS: InvestimentoTaxaTipo[] = ['Prefixado', 'CDI+', 'IPCA+', '% CDI']
const ALOCACAO_OPTIONS: AlocacaoTipo[] = ['Renda Fixa Longo', 'Renda Fixa Curto', 'Renda Variável']
const ALLOC_COLORS = { 'Renda Fixa Longo': '#3498db', 'Renda Fixa Curto': '#2ecc71', 'Renda Variável': '#e67e22' }

const EMPTY_FORM: Omit<InvestimentoPosition, 'id'> = {
  nome: '', tipo: 'CDB', instituicao: '', taxaAnual: 12, taxaTipo: 'Prefixado',
  valorAplicado: 0, saldoAtual: 0, liquidez: 'Diária', alocacao: 'Renda Fixa Longo',
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-bdr rounded-lg p-3 text-sm shadow-xl">
      <div className="font-medium text-gray-200 mb-2">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-gray-200 font-medium">{brl(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function Investimentos() {
  const { investimentos, addInvestimento, updateInvestimento, deleteInvestimento } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<InvestimentoPosition, 'id'>>(EMPTY_FORM)

  // Projection state
  const [projSaldo, setProjSaldo] = useState(0)
  const [projAporte, setProjAporte] = useState(1000)
  const [projTaxa, setProjTaxa] = useState(12)
  const [projHorizonte, setProjHorizonte] = useState(5)

  const totalInvestido = investimentos.reduce((s, i) => s + i.valorAplicado, 0)
  const totalSaldo = investimentos.reduce((s, i) => s + i.saldoAtual, 0)
  const rendimento = totalSaldo - totalInvestido
  const taxaMedia = investimentos.length > 0
    ? investimentos.reduce((s, i) => s + i.taxaAnual * i.saldoAtual, 0) / Math.max(1, totalSaldo)
    : 0

  // Allocation donut
  const allocMap: Record<string, number> = {}
  investimentos.forEach(i => { allocMap[i.alocacao] = (allocMap[i.alocacao] ?? 0) + i.saldoAtual })
  const allocData = Object.entries(allocMap).map(([name, value]) => ({ name, value }))

  // Projection data
  const projMeses = projHorizonte * 12
  const saldoBase = projSaldo > 0 ? projSaldo : totalSaldo
  const projPoints = investimentos.length > 0 && projSaldo === 0
    ? projectPortfolio(investimentos, projAporte, projMeses)
    : projectSingle(saldoBase, projAporte, projTaxa, projMeses)

  const chartData = projPoints.filter(p => p.month % 3 === 0 || p.month === 1).map(p => ({
    name: p.label || `M${p.month}`,
    Saldo: Math.round(p.saldo),
    Investido: Math.round(p.totalInvestido),
  }))

  const ano1 = projPoints[11]?.saldo ?? 0
  const ano3 = projPoints[35]?.saldo ?? 0
  const ano5 = projPoints[59]?.saldo ?? 0

  function openAdd() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(inv: InvestimentoPosition) {
    const { id, ...rest } = inv
    setEditId(id)
    setForm(rest)
    setShowForm(true)
  }

  function handleSave() {
    if (!form.nome) return
    if (editId) updateInvestimento(editId, form)
    else addInvestimento(form)
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Investimentos</h1>
        <p className="text-sm text-gray-400 mt-1">Portfólio e calculadora de projeção</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Investido" value={brl(totalInvestido)} color="blue" icon="💼" />
        <KpiCard title="Patrimônio Atual" value={brl(totalSaldo)} color="teal" icon="💰" />
        <KpiCard title="Rendimento" value={brl(rendimento)} subtitle={totalInvestido > 0 ? `+${pctNum(rendimento / totalInvestido * 100)}` : '—'} color="green" icon="📈" />
        <KpiCard title="Taxa Média" value={`${taxaMedia.toFixed(1)}% a.a.`} color="purple" icon="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Positions list */}
        <div className="lg:col-span-2 bg-surface border border-bdr rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-bdr flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Posições</h2>
            <button onClick={openAdd} className="text-xs bg-saldo/20 text-saldo px-3 py-1.5 rounded-lg hover:bg-saldo/30 transition-colors">
              + Adicionar posição
            </button>
          </div>
          {investimentos.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="text-3xl mb-2">💼</div>
              <div className="text-sm text-gray-400">Nenhuma posição cadastrada</div>
              <button onClick={openAdd} className="mt-3 text-xs text-saldo hover:underline">Adicionar primeira posição</button>
            </div>
          ) : (
            <div className="divide-y divide-bdr/50">
              {investimentos.map(inv => {
                const proj = projectPosition(inv, 60)
                return (
                  <div key={inv.id} className="px-4 py-3 hover:bg-white/5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-200 text-sm">{inv.nome}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{inv.tipo} · {inv.instituicao} · {inv.liquidez}</div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-200">{brl(inv.saldoAtual)}</div>
                        <div className="text-xs text-gray-500">{inv.taxaAnual}% a.a. {inv.taxaTipo}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: ALLOC_COLORS[inv.alocacao] + '30', color: ALLOC_COLORS[inv.alocacao] }}>
                        {inv.alocacao}
                      </span>
                      <div className="text-right text-xs">
                        <div className="text-gray-400">5 anos: <span className="text-receita font-medium">{brl(proj.ano5)}</span></div>
                      </div>
                      <button onClick={() => openEdit(inv)} className="text-gray-400 hover:text-saldo text-xs">✎</button>
                      <button onClick={() => deleteInvestimento(inv.id)} className="text-gray-400 hover:text-despesa text-xs">✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Allocation donut */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Alocação</h2>
          {allocData.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">Sem dados</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={allocData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {allocData.map((entry, i) => (
                      <Cell key={i} fill={ALLOC_COLORS[entry.name as AlocacaoTipo] ?? '#888'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ background: '#1c2333', border: '1px solid #2d3748', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {allocData.map(entry => (
                  <div key={entry.name} className="flex justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: ALLOC_COLORS[entry.name as AlocacaoTipo] }} />
                      <span className="text-gray-400">{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-300">{brl(entry.value)}</span>
                      {totalSaldo > 0 && <span className="text-gray-500 ml-1">({pctNum(entry.value / totalSaldo * 100)})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Projection calculator */}
      <div className="bg-surface border border-bdr rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-200 mb-6">Calculadora de Projeção</h2>

        {/* Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Saldo inicial</label>
            <CurrencyInput
              value={projSaldo}
              onChange={setProjSaldo}
              className="w-full"
              placeholder={totalSaldo > 0 ? `R$ ${brl(totalSaldo)}` : 'R$ 0,00'}
            />
            {totalSaldo > 0 && projSaldo === 0 && (
              <div className="text-xs text-gray-500 mt-1">Usando portfólio atual</div>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Aporte mensal</label>
            <CurrencyInput value={projAporte} onChange={setProjAporte} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Taxa anual (%)</label>
            <input
              type="number"
              value={projTaxa}
              onChange={e => setProjTaxa(parseFloat(e.target.value) || 0)}
              className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Horizonte: {projHorizonte} anos</label>
            <input
              type="range"
              min="1" max="30"
              value={projHorizonte}
              onChange={e => setProjHorizonte(parseInt(e.target.value))}
              className="w-full mt-2 accent-saldo"
            />
          </div>
        </div>

        {/* Milestone cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[{ label: '1 Ano', val: ano1, months: 12 }, { label: '3 Anos', val: ano3, months: 36 }, { label: '5 Anos', val: ano5, months: 60 }].map(ms => {
            const invested = saldoBase + projAporte * ms.months
            const gain = ms.val - invested
            const gainPct = invested > 0 ? gain / invested * 100 : 0
            return (
              <div key={ms.label} className="bg-surfaceAlt border border-bdr rounded-xl p-4">
                <div className="text-xs text-gray-400 font-medium mb-2">{ms.label}</div>
                <div className="text-xl font-bold text-gray-100">{brl(ms.val)}</div>
                <div className="text-xs text-gray-500 mt-1">Investido: {brl(invested)}</div>
                <div className={`text-xs font-medium mt-1 ${gain >= 0 ? 'text-receita' : 'text-despesa'}`}>
                  {gain >= 0 ? '+' : ''}{brl(gain)} ({gainPct.toFixed(1)}%)
                </div>
              </div>
            )
          })}
        </div>

        {/* Growth chart */}
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="Saldo" stroke="#1abc9c" fill="#1abc9c20" strokeWidth={2} />
            <Area type="monotone" dataKey="Investido" stroke="#3498db" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>

        {/* Per-position table */}
        {investimentos.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Projeção por Posição (sem aportes adicionais)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-bdr">
                    {['Nome', 'Saldo Atual', 'Taxa a.a.', '1 Ano', '3 Anos', '5 Anos'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {investimentos.map(inv => {
                    const p = projectPosition(inv, 60)
                    return (
                      <tr key={inv.id} className="border-b border-bdr/50 hover:bg-white/5">
                        <td className="px-3 py-2 text-gray-200">{inv.nome}</td>
                        <td className="px-3 py-2 text-gray-300">{brl(inv.saldoAtual)}</td>
                        <td className="px-3 py-2 text-gray-400">{inv.taxaAnual}%</td>
                        <td className="px-3 py-2 text-receita">{brl(p.ano1)}</td>
                        <td className="px-3 py-2 text-receita">{brl(p.ano3)}</td>
                        <td className="px-3 py-2 text-receita font-medium">{brl(p.ano5)}</td>
                      </tr>
                    )
                  })}
                  {investimentos.length > 1 && (
                    <tr className="bg-surfaceAlt">
                      <td className="px-3 py-2 font-semibold text-gray-200">Total</td>
                      <td className="px-3 py-2 font-semibold text-gray-200">{brl(totalSaldo)}</td>
                      <td className="px-3 py-2 text-gray-400">{taxaMedia.toFixed(1)}%*</td>
                      <td className="px-3 py-2 font-semibold text-receita">{brl(ano1)}</td>
                      <td className="px-3 py-2 font-semibold text-receita">{brl(ano3)}</td>
                      <td className="px-3 py-2 font-semibold text-receita">{brl(ano5)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {investimentos.length > 1 && <div className="text-xs text-gray-500 mt-2">* Taxa média ponderada pelo saldo</div>}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Posição' : 'Nova Posição'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs text-gray-400 mb-1">Nome do ativo</label>
            <input
              type="text"
              className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: CDB Banco Inter"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo</label>
            <Select value={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v as InvestimentoTipo }))}
              options={TIPO_OPTIONS.map(t => ({ value: t, label: t }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Instituição</label>
            <input
              type="text"
              className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={form.instituicao}
              onChange={e => setForm(f => ({ ...f, instituicao: e.target.value }))}
              placeholder="Ex: Nubank, XP"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Taxa anual (%)</label>
            <input
              type="number"
              className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={form.taxaAnual}
              onChange={e => setForm(f => ({ ...f, taxaAnual: parseFloat(e.target.value) || 0 }))}
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo de taxa</label>
            <Select value={form.taxaTipo} onChange={v => setForm(f => ({ ...f, taxaTipo: v as InvestimentoTaxaTipo }))}
              options={TAXA_TIPO_OPTIONS.map(t => ({ value: t, label: t }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Valor aplicado</label>
            <CurrencyInput value={form.valorAplicado} onChange={v => setForm(f => ({ ...f, valorAplicado: v }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Saldo atual</label>
            <CurrencyInput value={form.saldoAtual} onChange={v => setForm(f => ({ ...f, saldoAtual: v }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Liquidez</label>
            <Select value={form.liquidez} onChange={v => setForm(f => ({ ...f, liquidez: v as InvestimentoLiquidez }))}
              options={LIQUIDEZ_OPTIONS.map(l => ({ value: l, label: l }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Alocação</label>
            <Select value={form.alocacao} onChange={v => setForm(f => ({ ...f, alocacao: v as AlocacaoTipo }))}
              options={ALOCACAO_OPTIONS.map(a => ({ value: a, label: a }))} className="w-full" />
          </div>
          <div className="col-span-2 flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-bdr text-gray-400 text-sm hover:text-gray-200">Cancelar</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-saldo text-gray-900 font-medium text-sm hover:bg-saldo/90">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
