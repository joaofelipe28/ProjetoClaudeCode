import { useAnnualProjection } from '@/hooks/useMonthlyCalculations'
import { useStore } from '@/store'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { brl, mesLabel, addMonths } from '@/lib/formatters'
import { getParcelamentoValue, computeFixosTotal } from '@/lib/calculations'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'

const MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
function mesFull(mesAno: string): string {
  const [y, m] = mesAno.split('-').map(Number)
  return `${MESES_FULL[m - 1]} de ${y}`
}

const TYPE_COLOR: Record<string, string> = {
  Fixo: 'bg-despesa/15 text-despesa',
  Parcela: 'bg-parcela/15 text-parcela',
  Pontual: 'bg-pontual/15 text-pontual',
  DARF: 'bg-darf/15 text-darf',
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm shadow-xl">
      <div className="font-medium text-gray-800 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-medium" style={{ color: p.value < 0 ? '#dc2626' : '#0891b2' }}>{brl(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export function Dashboard() {
  const months = useAnnualProjection()
  const {
    config, tomadores, incomeRecords, receitasPontuais, monthlyDebits,
    fixos, parcelamentos, pontuais,
  } = useStore()

  const mesAtual = config.mesAtual
  const prevMes = addMonths(mesAtual, -1)
  const prevDarfKey = `darf-${prevMes}`
  const monthSummary = months.find(m => m.mesAno === mesAtual)

  // ── Saldo atual REAL (caixa) ──────────────────────────────────────────────
  // saldoInicial + tudo que entrou pago − tudo que saiu pago (todos os meses)
  const entradasPagas = incomeRecords.filter(r => r.status === 'Pago').reduce((s, r) => s + r.valorRealizado, 0)
    + receitasPontuais.filter(r => r.status === 'Confirmado').reduce((s, r) => s + r.valor, 0)
  const saidasPagas = monthlyDebits.filter(d => d.status === 'Pago').reduce((s, d) => s + d.valorPago, 0)
  const saldoAtualReal = config.saldoInicial + entradasPagas - saidasPagas

  // ── Receita do mês atual ──────────────────────────────────────────────────
  const recordsMes = incomeRecords.filter(r => r.mesAno === mesAtual)
  const extrasMes = receitasPontuais.filter(r => r.mesAno === mesAtual && r.status !== 'Cancelado')
  const recebidoMes = recordsMes.filter(r => r.status === 'Pago').reduce((s, r) => s + r.valorRealizado, 0)
    + extrasMes.filter(r => r.status === 'Confirmado').reduce((s, r) => s + r.valor, 0)
  const faltaReceberMes = tomadores.filter(t => t.ativo).reduce((s, t) => {
    const rec = recordsMes.find(r => r.tomadorId === t.id)
    if (rec?.status === 'Pago' || rec?.status === 'Cancelado') return s
    const v = rec && rec.valorRealizado > 0 ? rec.valorRealizado : (rec?.valorPrevisto ?? t.valorPrevisto)
    return s + v
  }, 0) + extrasMes.filter(r => r.status === 'Previsto').reduce((s, r) => s + r.valor, 0)
  const receitaTotalMes = recebidoMes + faltaReceberMes

  // ── Contas do mês atual ───────────────────────────────────────────────────
  function debitStatus(refId: string) {
    return monthlyDebits.find(d => d.referenceId === refId && d.mesAno === mesAtual)?.status
  }

  const debitItems: { id: string; nome: string; cat: string; valor: number; type: string }[] = [
    ...fixos.filter(f => f.status === 'Ativo').map(f => ({ id: f.id, nome: f.descricao, cat: f.categoria, valor: f.valor, type: 'Fixo' })),
    ...parcelamentos.map(p => ({ id: p.id, nome: p.descricao, cat: p.tipo, valor: getParcelamentoValue(p, mesAtual), type: 'Parcela' })).filter(x => x.valor > 0),
    ...pontuais.filter(p => p.mesAno === mesAtual && p.status !== 'Cancelado').map(p => ({ id: p.id, nome: p.descricao, cat: p.categoria, valor: p.valor, type: 'Pontual' })),
  ]
  if (monthSummary && monthSummary.darf > 0) {
    debitItems.push({ id: prevDarfKey, nome: `DARF — ref. ${mesLabel(prevMes)}`, cat: 'Imposto', valor: monthSummary.darf, type: 'DARF' })
  }

  const contasPagar = debitItems.filter(d => debitStatus(d.id) !== 'Pago' && debitStatus(d.id) !== 'Pulado').sort((a, b) => b.valor - a.valor)
  const totalPagar = contasPagar.reduce((s, d) => s + d.valor, 0)
  const totalPagoMes = debitItems.filter(d => debitStatus(d.id) === 'Pago').reduce((s, d) => s + d.valor, 0)
  const totalContasMes = totalPagar + totalPagoMes
  const countContasMes = debitItems.filter(d => debitStatus(d.id) !== 'Pulado').length
  const countPagasMes = debitItems.filter(d => debitStatus(d.id) === 'Pago').length

  // ── Pendências (puladas, todos os meses) ──────────────────────────────────
  const pendencias = monthlyDebits.filter(d => d.status === 'Pulado')
  const totalPendencias = pendencias.reduce((s, d) => s + d.valorPago, 0)

  // ── Alertas ───────────────────────────────────────────────────────────────
  const mesesVermelho = months.filter(m => m.saldoAcumulado < 0)
  const mesesCriticos = months.filter(m => m.status === 'Crítico')
  const fixosTotal = computeFixosTotal(fixos)
  const reservaAlvo = fixosTotal * config.reservaMesesAlvo

  // ── Gráfico saldo acumulado ───────────────────────────────────────────────
  const lineData = months.map(m => ({ name: m.label, Saldo: Math.round(m.saldoAcumulado) }))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Visão Geral</h1>
        <p className="text-sm text-gray-500 mt-1">Foco em {mesFull(mesAtual)}</p>
      </div>

      {/* ── HERO: mês atual em foco ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-800">{mesFull(mesAtual)}</h2>
            {monthSummary && <StatusBadge status={monthSummary.status} />}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Saldo do mês (projetado)</div>
            <div className={`text-lg font-bold ${(monthSummary?.saldoMes ?? 0) >= 0 ? 'text-receita' : 'text-despesa'}`}>
              {brl(monthSummary?.saldoMes ?? 0)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Receita */}
          <div className="px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">📥 Receita</span>
              <span className="text-xs text-gray-400">
                {receitaTotalMes > 0 ? `${Math.round((recebidoMes / receitaTotalMes) * 100)}% recebido` : '—'}
              </span>
            </div>
            <ProgressBar value={recebidoMes} total={receitaTotalMes} color="bg-receita" />
            <div className="flex items-center justify-between text-sm pt-1">
              <div>
                <div className="text-receita font-bold">{brl(recebidoMes)}</div>
                <div className="text-xs text-gray-400">já recebido</div>
              </div>
              <div className="text-right">
                <div className="text-gray-700 font-semibold">{brl(faltaReceberMes)}</div>
                <div className="text-xs text-gray-400">falta receber</div>
              </div>
            </div>
          </div>

          {/* Contas */}
          <div className="px-5 py-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">📋 Contas</span>
              <span className="text-xs text-gray-400">{countPagasMes}/{countContasMes} pagas</span>
            </div>
            <ProgressBar value={totalPagoMes} total={totalContasMes} color="bg-saldo" />
            <div className="flex items-center justify-between text-sm pt-1">
              <div>
                <div className="text-saldo font-bold">{brl(totalPagoMes)}</div>
                <div className="text-xs text-gray-400">já pago</div>
              </div>
              <div className="text-right">
                <div className="text-despesa font-semibold">{brl(totalPagar)}</div>
                <div className="text-xs text-gray-400">a pagar</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs essenciais ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide">💵 Saldo em caixa</div>
          <div className={`text-2xl font-bold mt-1 ${saldoAtualReal >= 0 ? 'text-saldo' : 'text-despesa'}`}>{brl(saldoAtualReal)}</div>
          <div className="text-xs text-gray-400 mt-1">recebido − pago, real</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide">⏳ Falta receber</div>
          <div className="text-2xl font-bold mt-1 text-receita">{brl(faltaReceberMes)}</div>
          <div className="text-xs text-gray-400 mt-1">em {mesLabel(mesAtual)}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide">💳 A pagar</div>
          <div className="text-2xl font-bold mt-1 text-despesa">{brl(totalPagar)}</div>
          <div className="text-xs text-gray-400 mt-1">{contasPagar.length} contas em {mesLabel(mesAtual)}</div>
        </div>
        <div className={`bg-white border rounded-xl p-4 shadow-sm ${pendencias.length > 0 ? 'border-alerta/40' : 'border-gray-200'}`}>
          <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide">📌 Pendências</div>
          <div className={`text-2xl font-bold mt-1 ${pendencias.length > 0 ? 'text-alerta' : 'text-gray-400'}`}>{brl(totalPendencias)}</div>
          <div className="text-xs text-gray-400 mt-1">{pendencias.length} {pendencias.length === 1 ? 'conta pulada' : 'contas puladas'}</div>
        </div>
      </div>

      {/* ── Duas colunas: contas a pagar + atenção ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximas contas a pagar */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">A pagar em {mesLabel(mesAtual)}</h2>
            <span className="text-sm font-bold text-despesa">{brl(totalPagar)}</span>
          </div>
          {contasPagar.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              ✅ Todas as contas de {mesLabel(mesAtual)} estão pagas!
            </div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {contasPagar.slice(0, 8).map(d => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{d.nome}</div>
                    <div className="text-xs text-gray-400">{d.cat}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[d.type] ?? 'bg-gray-100 text-gray-500'}`}>{d.type}</span>
                  <div className="text-sm font-semibold text-despesa w-24 text-right">{brl(d.valor)}</div>
                </div>
              ))}
              {contasPagar.length > 8 && (
                <div className="px-4 py-2 text-center text-xs text-gray-400">+ {contasPagar.length - 8} outras contas</div>
              )}
            </div>
          )}
        </div>

        {/* Atenção / Alertas */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">⚠️ Atenção</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {pendencias.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-alerta/10 flex items-center justify-center text-alerta text-lg flex-shrink-0">📌</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{pendencias.length} {pendencias.length === 1 ? 'conta pendente' : 'contas pendentes'}</div>
                  <div className="text-xs text-gray-400">Puladas de meses anteriores · {brl(totalPendencias)} — veja a aba Pendentes</div>
                </div>
              </div>
            )}
            {mesesVermelho.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-despesa/10 flex items-center justify-center text-despesa text-lg flex-shrink-0">📉</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{mesesVermelho.length} {mesesVermelho.length === 1 ? 'mês' : 'meses'} com saldo negativo</div>
                  <div className="text-xs text-gray-400">{mesesVermelho.slice(0, 4).map(m => m.label).join(', ')}{mesesVermelho.length > 4 ? '…' : ''}</div>
                </div>
              </div>
            )}
            {mesesCriticos.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-despesa/10 flex items-center justify-center text-despesa text-lg flex-shrink-0">🔴</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{mesesCriticos.length} {mesesCriticos.length === 1 ? 'mês crítico' : 'meses críticos'}</div>
                  <div className="text-xs text-gray-400">Despesas acima de {Math.round(config.limiteAlerta * 100)}% da receita</div>
                </div>
              </div>
            )}
            {saldoAtualReal < reservaAlvo && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-alerta/10 flex items-center justify-center text-alerta text-lg flex-shrink-0">🛡️</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">Reserva de emergência abaixo da meta</div>
                  <div className="text-xs text-gray-400">Caixa {brl(saldoAtualReal)} de {brl(reservaAlvo)} ({config.reservaMesesAlvo}× fixos)</div>
                </div>
              </div>
            )}
            {pendencias.length === 0 && mesesVermelho.length === 0 && mesesCriticos.length === 0 && saldoAtualReal >= reservaAlvo && (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                ✅ Tudo sob controle — nenhum alerta no momento
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Linha do tempo: saldo acumulado ──────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Evolução do saldo acumulado</h2>
          <span className="text-xs text-gray-400">{months[0]?.label} – {months[months.length - 1]?.label}</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={lineData}>
            <defs>
              <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" strokeWidth={1} />
            <Area type="monotone" dataKey="Saldo" stroke="#0891b2" fill="url(#saldoGrad)" strokeWidth={2.5} dot={{ fill: '#0891b2', r: 3 }} activeDot={{ r: 6 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
