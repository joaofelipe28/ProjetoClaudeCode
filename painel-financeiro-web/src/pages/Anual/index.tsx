import { useAnnualProjection } from '@/hooks/useMonthlyCalculations'
import { useStore } from '@/store'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { brl, pctNum } from '@/lib/formatters'
import { computeFixosTotal, getParcelamentoSaldoRestante } from '@/lib/calculations'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  AreaChart, Area, Cell,
} from 'recharts'

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

export function Anual() {
  const months = useAnnualProjection()
  const { fixos, parcelamentos, config } = useStore()

  const fixosTotal = computeFixosTotal(fixos)
  const reservaAlvo = fixosTotal * config.reservaMesesAlvo

  const totalReceita = months.reduce((s, m) => s + (m.receitaRealizada || m.receitaPrevista), 0)
  const totalDespesas = months.reduce((s, m) => s + m.totalDespesas, 0)
  const totalDarf = months.reduce((s, m) => s + m.darf, 0)
  const totalParcelas = months.reduce((s, m) => s + m.parcelasTotal, 0)
  const totalAportes = months.reduce((s, m) => s + m.aportes, 0)

  const cashflowData = months.map(m => ({
    name: m.label,
    'Saldo Mensal': m.saldoMes,
  }))

  const accData = months.map(m => ({
    name: m.label,
    'Saldo Acumulado': m.saldoAcumulado,
    'Reserva Alvo': reservaAlvo,
  }))

  // Debt paydown per month
  const debtData = months.map(m => {
    const pjDebt = parcelamentos.filter(p => p.tipo === 'PJ').reduce((s, p) => s + getParcelamentoSaldoRestante(p, m.mesAno), 0)
    const pessoalDebt = parcelamentos.filter(p => p.tipo === 'Pessoal').reduce((s, p) => s + getParcelamentoSaldoRestante(p, m.mesAno), 0)
    return { name: m.label, 'Dívida PJ': pjDebt, 'Dívida Pessoal': pessoalDebt }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Projeção Anual 2026</h1>
        <p className="text-sm text-gray-400 mt-1">Mai–Dez 2026</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Receita Total" value={brl(totalReceita)} color="green" icon="📥" />
        <KpiCard title="Despesas Total" value={brl(totalDespesas)} color="red" icon="📤" />
        <KpiCard title="DARF Total" value={brl(totalDarf)} color="purple" icon="🏛️" />
        <KpiCard title="Parcelas Total" value={brl(totalParcelas)} color="orange" icon="💳" />
        <KpiCard title="Aportes Total" value={brl(totalAportes)} color="teal" icon="💰" />
      </div>

      {/* Full table */}
      <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-bdr">
          <h2 className="text-sm font-semibold text-gray-200">Tabela Anual Completa</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Mês', 'Receita', 'Fixos', 'Parc. PJ', 'Parc. Pessoal', 'DARF', 'Pontuais', 'Aportes', 'Total Desp.', 'Saldo Mês', 'Saldo Acum.', 'Status'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map((m, i) => {
                const pjParcelas = parcelamentos.filter(p => p.tipo === 'PJ').reduce((s, p) => {
                  const v = p.status === 'Ativo' ? Math.max(0, (() => { const diff = (parseInt(m.mesAno.split('-')[0]) - parseInt(p.mesInicio.split('-')[0])) * 12 + parseInt(m.mesAno.split('-')[1]) - parseInt(p.mesInicio.split('-')[1]); return diff >= 0 && diff < p.totalParcelas ? p.valorParcela : 0 })()) : 0; return s + v
                }, 0)
                const pessoalParcelas = m.parcelasTotal - pjParcelas
                return (
                  <tr key={m.mesAno} className={`border-b border-bdr/50 hover:bg-white/5 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-200">{m.label}</td>
                    <td className="px-3 py-2.5 text-receita">{brl(m.receitaRealizada || m.receitaPrevista)}</td>
                    <td className="px-3 py-2.5 text-despesa">{brl(m.fixos)}</td>
                    <td className="px-3 py-2.5 text-pjParcela">{brl(pjParcelas)}</td>
                    <td className="px-3 py-2.5 text-parcela">{brl(pessoalParcelas)}</td>
                    <td className="px-3 py-2.5 text-darf">{brl(m.darf)}</td>
                    <td className="px-3 py-2.5 text-pontual">{m.pontuais > 0 ? brl(m.pontuais) : '—'}</td>
                    <td className="px-3 py-2.5 text-saldo">{m.aportes > 0 ? brl(m.aportes) : '—'}</td>
                    <td className="px-3 py-2.5 text-gray-400">{brl(m.totalDespesas)}</td>
                    <td className={`px-3 py-2.5 font-medium ${m.saldoMes >= 0 ? 'text-receita' : 'text-despesa'}`}>{brl(m.saldoMes)}</td>
                    <td className={`px-3 py-2.5 font-medium ${m.saldoAcumulado >= 0 ? 'text-gray-200' : 'text-despesa'}`}>{brl(m.saldoAcumulado)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={m.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cashflow bar */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Saldo Mensal</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cashflowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Saldo Mensal" radius={[4, 4, 0, 0]}
                fill="#2ecc71"
                label={false}
              >
                {cashflowData.map((entry, i) => (
                  <Cell key={i} fill={entry['Saldo Mensal'] >= 0 ? '#2ecc71' : '#e74c3c'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Accumulated + reserve target */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Saldo Acumulado vs Reserva</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={accData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="Saldo Acumulado" stroke="#1abc9c" fill="#1abc9c20" strokeWidth={2} />
              <Area type="monotone" dataKey="Reserva Alvo" stroke="#f1c40f" fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Debt paydown */}
        {parcelamentos.length > 0 && (
          <div className="bg-surface border border-bdr rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-200 mb-4">Quitação de Dívidas</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={debtData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
                <Area type="monotone" dataKey="Dívida PJ" stroke="#3498db" fill="#3498db20" strokeWidth={2} />
                <Area type="monotone" dataKey="Dívida Pessoal" stroke="#e67e22" fill="#e67e2220" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* % comprometido */}
        <div className="bg-surface border border-bdr rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">% Renda Comprometida</h2>
          <div className="space-y-3">
            {months.map(m => (
              <div key={m.mesAno}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{m.label}</span>
                  <span className={m.pctComprometido > 0.9 ? 'text-despesa' : m.pctComprometido > 0.75 ? 'text-alerta' : 'text-receita'}>
                    {pctNum(m.pctComprometido * 100)}
                  </span>
                </div>
                <div className="h-2 bg-surfaceAlt rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${m.pctComprometido > 0.9 ? 'bg-despesa' : m.pctComprometido > 0.75 ? 'bg-alerta' : 'bg-receita'}`}
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
