import { useAnnualProjection } from '@/hooks/useMonthlyCalculations'
import { useStore } from '@/store'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { brl, pctNum } from '@/lib/formatters'
import { computeFixosTotal, computeBreakEven } from '@/lib/calculations'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'

const CATEGORY_COLORS = [
  '#2ecc71', '#e74c3c', '#e67e22', '#9b59b6', '#3498db',
  '#f39c12', '#1abc9c', '#e91e63', '#ff5722', '#607d8b',
]

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

export function Dashboard() {
  const months = useAnnualProjection()
  const { fixos, parcelamentos, config } = useStore()

  const fixosTotal = computeFixosTotal(fixos)
  const taxaEfetiva = config.taxConfig.pis + config.taxConfig.cofins + config.taxConfig.irpj + config.taxConfig.csll + config.taxConfig.iss
  const breakEven = computeBreakEven(fixos, parcelamentos, config.mesAtual, taxaEfetiva)
  const reservaAlvo = fixosTotal * config.reservaMesesAlvo

  // Find last month with any realized income
  const lastWithIncome = [...months].reverse().find(m => m.receitaRealizada > 0)
  const saldoFinal = months[months.length - 1]?.saldoAcumulado ?? 0
  const saldoAtual = lastWithIncome?.saldoAcumulado ?? config.saldoInicial

  // Bar chart data
  const barData = months.map(m => ({
    name: m.label,
    Receitas: m.receitaRealizada || m.receitaPrevista,
    Fixos: m.fixos,
    Parcelas: m.parcelasTotal,
    DARF: m.darf,
  }))

  // Line chart data
  const lineData = months.map(m => ({
    name: m.label,
    Saldo: m.saldoAcumulado,
  }))

  // Expense composition (current month)
  const current = months.find(m => m.mesAno === config.mesAtual) ?? months[0]
  const categories: Record<string, number> = {}
  if (current) {
    fixos.filter(f => f.status === 'Ativo').forEach(f => {
      categories[f.categoria] = (categories[f.categoria] ?? 0) + f.valor
    })
  }
  const pieData = Object.entries(categories).map(([name, value]) => ({ name, value }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Visão Geral</h1>
        <p className="text-sm text-gray-400 mt-1">Mai–Dez 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Saldo Atual" value={brl(saldoAtual)} color="teal" icon="💵" />
        <KpiCard title="Fixos/mês" value={brl(fixosTotal)} color="red" icon="📌" />
        <KpiCard title="Break-even" value={brl(breakEven)} subtitle="Receita mínima" color="orange" icon="⚖️" />
        <KpiCard
          title="Runway"
          value={fixosTotal > 0 ? `${(saldoAtual / fixosTotal).toFixed(1)} meses` : '—'}
          subtitle="Com saldo atual"
          color="blue"
          icon="🏃"
        />
        <KpiCard
          title="Reserva emergência"
          value={brl(reservaAlvo)}
          subtitle={`Meta: ${config.reservaMesesAlvo}× fixos`}
          color="purple"
          icon="🛡️"
        />
        <KpiCard title="Saldo Dez/26" value={brl(saldoFinal)} subtitle="Projeção" color="green" icon="🎯" />
      </div>

      {/* Monthly summary table */}
      <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-bdr">
          <h2 className="text-sm font-semibold text-gray-200">Resumo Mensal</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Mês', 'Receita Prev.', 'Receita Real.', 'Fixos', 'Parcelas', 'DARF', 'Saldo Mês', 'Saldo Acum.', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => (
                <tr key={m.mesAno} className={`border-b border-bdr/50 hover:bg-white/5 transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-200">{m.label}</td>
                  <td className="px-4 py-2.5 text-gray-400">{brl(m.receitaPrevista)}</td>
                  <td className={`px-4 py-2.5 font-medium ${m.receitaRealizada > 0 ? 'text-receita' : 'text-gray-500'}`}>
                    {m.receitaRealizada > 0 ? brl(m.receitaRealizada) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-despesa">{brl(m.fixos)}</td>
                  <td className="px-4 py-2.5 text-parcela">{brl(m.parcelasTotal)}</td>
                  <td className="px-4 py-2.5 text-darf">{brl(m.darf)}</td>
                  <td className={`px-4 py-2.5 font-medium ${m.saldoMes >= 0 ? 'text-receita' : 'text-despesa'}`}>
                    {brl(m.saldoMes)}
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${m.saldoAcumulado >= 0 ? 'text-gray-200' : 'text-despesa'}`}>
                    {brl(m.saldoAcumulado)}
                  </td>
                  <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar chart */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Receitas vs Despesas</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
              <Bar dataKey="Receitas" fill="#2ecc71" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Fixos" fill="#e74c3c" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Parcelas" fill="#e67e22" radius={[3, 3, 0, 0]} />
              <Bar dataKey="DARF" fill="#9b59b6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Saldo Acumulado</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Saldo" stroke="#1abc9c" strokeWidth={2} dot={{ fill: '#1abc9c', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense donut */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Composição Fixos ({brl(fixosTotal)}/mês)</h2>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => brl(Number(v))} contentStyle={{ background: '#1c2333', border: '1px solid #2d3748', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {pieData.map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                    <span className="text-gray-400">{entry.name}</span>
                  </div>
                  <span className="text-gray-300 font-medium">{brl(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* % comprometido */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">% Comprometido por Mês</h2>
          <div className="space-y-3">
            {months.map(m => (
              <div key={m.mesAno}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{m.label}</span>
                  <span className={m.pctComprometido > 0.9 ? 'text-despesa' : m.pctComprometido > 0.75 ? 'text-alerta' : 'text-receita'}>
                    {pctNum(m.pctComprometido * 100)}
                  </span>
                </div>
                <div className="h-1.5 bg-surfaceAlt rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.pctComprometido > 0.9 ? 'bg-despesa' : m.pctComprometido > 0.75 ? 'bg-alerta' : 'bg-receita'
                    }`}
                    style={{ width: `${Math.min(100, m.pctComprometido * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
