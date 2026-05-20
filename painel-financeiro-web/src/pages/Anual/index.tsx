import { useAnnualProjection } from '@/hooks/useMonthlyCalculations'
import { useStore } from '@/store'
import { KpiCard } from '@/components/ui/KpiCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { brl, pctNum, mesLabel } from '@/lib/formatters'
import { computeFixosTotal, getParcelamentoSaldoRestante, getParcelamentoValue } from '@/lib/calculations'
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
  const { fixos, parcelamentos, pontuais, config } = useStore()

  const fixosTotal = computeFixosTotal(fixos)
  const reservaAlvo = fixosTotal * config.reservaMesesAlvo

  const totalReceita = months.reduce((s, m) => s + (m.receitaRealizada || m.receitaPrevista), 0)
  const totalDespesas = months.reduce((s, m) => s + m.totalDespesas, 0)
  const totalDarf = months.reduce((s, m) => s + m.darf, 0)
  const totalParcelas = months.reduce((s, m) => s + m.parcelasTotal, 0)
  const totalAportes = months.reduce((s, m) => s + m.aportes, 0)

  // ── Composição detalhada de despesas ──────────────────────────────────────
  const numMeses = months.length

  const itensFixos = fixos
    .filter(f => f.status === 'Ativo')
    .map(f => ({ descricao: f.descricao, categoria: f.categoria, tipo: 'Fixo' as const, mensal: f.valor, total: f.valor * numMeses }))
    .sort((a, b) => b.total - a.total)

  const itensParcelamentos = parcelamentos
    .filter(p => p.status === 'Ativo')
    .map(p => {
      const total = months.reduce((s, m) => s + getParcelamentoValue(p, m.mesAno), 0)
      return { descricao: p.descricao, categoria: p.categoria ?? p.tipo, tipo: p.tipo === 'PJ' ? 'Parc. PJ' as const : 'Parc. Pessoal' as const, mensal: p.valorParcela, total }
    })
    .filter(p => p.total > 0)
    .sort((a, b) => b.total - a.total)

  const totalDarfPeriodo = months.reduce((s, m) => s + m.darf, 0)

  const itensPontuais = Object.entries(
    pontuais
      .filter(p => months.some(m => m.mesAno === p.mesAno) && p.status !== 'Cancelado')
      .reduce((acc, p) => { acc[p.categoria] = (acc[p.categoria] || 0) + p.valor; return acc }, {} as Record<string, number>)
  )
    .map(([cat, total]) => ({ descricao: cat, categoria: cat, tipo: 'Pontual' as const, mensal: null, total }))
    .sort((a, b) => b.total - a.total)

  const grandTotal = itensFixos.reduce((s, i) => s + i.total, 0)
    + itensParcelamentos.reduce((s, i) => s + i.total, 0)
    + totalDarfPeriodo
    + itensPontuais.reduce((s, i) => s + i.total, 0)

  const TIPO_STYLE: Record<string, string> = {
    'Fixo': 'bg-despesa/20 text-despesa',
    'Parc. PJ': 'bg-blue-500/20 text-blue-400',
    'Parc. Pessoal': 'bg-parcela/20 text-parcela',
    'DARF': 'bg-darf/20 text-darf',
    'Pontual': 'bg-pontual/20 text-pontual',
  }

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
        <h1 className="text-xl font-bold text-gray-100">Projeção Anual</h1>
        <p className="text-sm text-gray-400 mt-1">{months.length > 0 ? `${mesLabel(months[0].mesAno)} – ${mesLabel(months[months.length - 1].mesAno)}` : ''}</p>
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

      {/* ── Composição de Despesas ──────────────────────────────────────── */}
      <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-bdr flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">📊 Composição de Despesas — {mesLabel(months[0]?.mesAno ?? '')} a {mesLabel(months[months.length - 1]?.mesAno ?? '')}</h2>
          <span className="text-xs text-gray-500">Total: <span className="text-gray-300 font-semibold">{brl(grandTotal)}</span></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-bdr">
                {['Descrição', 'Tipo', 'Categoria', 'Mensal', `Total (${numMeses} meses)`, '% do Total'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Fixos */}
              {itensFixos.map((item, i) => (
                <tr key={`fixo-${i}`} className="border-b border-bdr/40 hover:bg-white/5">
                  <td className="px-3 py-2 text-gray-200 text-sm">{item.descricao}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_STYLE['Fixo']}`}>Fixo</span></td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{item.categoria}</td>
                  <td className="px-3 py-2 text-gray-300">{brl(item.mensal)}</td>
                  <td className="px-3 py-2 font-medium text-despesa">{brl(item.total)}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{((item.total / grandTotal) * 100).toFixed(1)}%</td>
                </tr>
              ))}

              {/* Subtotal Fixos */}
              <tr className="bg-despesa/5 border-b border-bdr">
                <td className="px-3 py-1.5 text-xs font-semibold text-despesa" colSpan={3}>Subtotal Fixos</td>
                <td />
                <td className="px-3 py-1.5 text-xs font-semibold text-despesa">{brl(itensFixos.reduce((s, i) => s + i.total, 0))}</td>
                <td className="px-3 py-1.5 text-xs text-despesa">{((itensFixos.reduce((s, i) => s + i.total, 0) / grandTotal) * 100).toFixed(1)}%</td>
              </tr>

              {/* Parcelamentos */}
              {itensParcelamentos.map((item, i) => (
                <tr key={`parc-${i}`} className="border-b border-bdr/40 hover:bg-white/5">
                  <td className="px-3 py-2 text-gray-200 text-sm">{item.descricao}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_STYLE[item.tipo]}`}>{item.tipo}</span></td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{item.categoria}</td>
                  <td className="px-3 py-2 text-gray-300">{brl(item.mensal)}</td>
                  <td className="px-3 py-2 font-medium text-parcela">{brl(item.total)}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{((item.total / grandTotal) * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {itensParcelamentos.length > 0 && (
                <tr className="bg-parcela/5 border-b border-bdr">
                  <td className="px-3 py-1.5 text-xs font-semibold text-parcela" colSpan={3}>Subtotal Parcelamentos</td>
                  <td />
                  <td className="px-3 py-1.5 text-xs font-semibold text-parcela">{brl(itensParcelamentos.reduce((s, i) => s + i.total, 0))}</td>
                  <td className="px-3 py-1.5 text-xs text-parcela">{((itensParcelamentos.reduce((s, i) => s + i.total, 0) / grandTotal) * 100).toFixed(1)}%</td>
                </tr>
              )}

              {/* DARF */}
              {totalDarfPeriodo > 0 && (
                <tr className="border-b border-bdr/40 hover:bg-white/5">
                  <td className="px-3 py-2 text-gray-200 text-sm">DARF (Lucro Presumido)</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_STYLE['DARF']}`}>DARF</span></td>
                  <td className="px-3 py-2 text-gray-400 text-xs">Imposto</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">variável</td>
                  <td className="px-3 py-2 font-medium text-darf">{brl(totalDarfPeriodo)}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{((totalDarfPeriodo / grandTotal) * 100).toFixed(1)}%</td>
                </tr>
              )}

              {/* Pontuais por categoria */}
              {itensPontuais.map((item, i) => (
                <tr key={`pont-${i}`} className="border-b border-bdr/40 hover:bg-white/5">
                  <td className="px-3 py-2 text-gray-200 text-sm">{item.descricao}</td>
                  <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_STYLE['Pontual']}`}>Pontual</span></td>
                  <td className="px-3 py-2 text-gray-400 text-xs">{item.categoria}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">—</td>
                  <td className="px-3 py-2 font-medium text-pontual">{brl(item.total)}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{((item.total / grandTotal) * 100).toFixed(1)}%</td>
                </tr>
              ))}

              {/* Grand total */}
              <tr className="bg-surfaceAlt">
                <td className="px-3 py-3 font-bold text-gray-100 text-sm" colSpan={3}>TOTAL GERAL</td>
                <td />
                <td className="px-3 py-3 font-bold text-gray-100 text-sm">{brl(grandTotal)}</td>
                <td className="px-3 py-3 text-xs text-gray-400">100%</td>
              </tr>
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
