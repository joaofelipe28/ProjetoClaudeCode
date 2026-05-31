import { useStore } from '@/store'
import { brl, mesLabel } from '@/lib/formatters'
import type { DebitType } from '@/types'

const TYPE_LABEL: Record<DebitType, string> = {
  Fixo: 'Fixo',
  Parcelamento: 'Parcela',
  Pontual: 'Pontual',
  DARF: 'DARF',
  Aporte: 'Aporte',
}

const TYPE_COLOR: Record<DebitType, string> = {
  Fixo: 'bg-despesa/15 text-despesa',
  Parcelamento: 'bg-parcela/15 text-parcela',
  Pontual: 'bg-pontual/15 text-pontual',
  DARF: 'bg-darf/15 text-darf',
  Aporte: 'bg-saldo/15 text-saldo',
}

export function Pendentes() {
  const {
    monthlyDebits, fixos, parcelamentos, pontuais, aportes, investimentos,
    toggleDebitPago, unskipDebit,
  } = useStore()

  // Todos os itens pulados
  const pulados = monthlyDebits
    .filter(d => d.status === 'Pulado')
    .sort((a, b) => a.mesAno.localeCompare(b.mesAno))

  const totalPendente = pulados.reduce((s, d) => s + d.valorPago, 0)

  // Resolve o nome legível de cada referenceId
  function getDescricao(referenceId: string, type: DebitType): string {
    if (type === 'DARF') {
      const mes = referenceId.replace('darf-', '')
      return `DARF — ref. ${mesLabel(mes)}`
    }
    if (type === 'Fixo') return fixos.find(f => f.id === referenceId)?.descricao ?? referenceId
    if (type === 'Parcelamento') return parcelamentos.find(p => p.id === referenceId)?.descricao ?? referenceId
    if (type === 'Pontual') return pontuais.find(p => p.id === referenceId)?.descricao ?? referenceId
    if (type === 'Aporte') {
      const a = aportes.find(a => a.id === referenceId)
      const inv = a ? investimentos.find(i => i.id === a.investimentoId) : null
      return inv ? `Aporte — ${inv.nome}` : 'Aporte'
    }
    return referenceId
  }

  function getCategoria(referenceId: string, type: DebitType): string {
    if (type === 'Fixo') return fixos.find(f => f.id === referenceId)?.categoria ?? '—'
    if (type === 'Parcelamento') return parcelamentos.find(p => p.id === referenceId)?.tipo ?? '—'
    if (type === 'Pontual') return pontuais.find(p => p.id === referenceId)?.categoria ?? '—'
    if (type === 'DARF') return 'Imposto'
    if (type === 'Aporte') return 'Investimento'
    return '—'
  }

  function handlePagar(referenceId: string, type: DebitType, mesAno: string, valor: number) {
    // Remove o status Pulado e marca como Pago
    unskipDebit(referenceId, mesAno)
    toggleDebitPago(referenceId, type, mesAno, valor)
  }

  function handleDesfazer(referenceId: string, mesAno: string) {
    unskipDebit(referenceId, mesAno)
  }

  // Agrupar por mês
  const porMes: Record<string, typeof pulados> = {}
  for (const d of pulados) {
    if (!porMes[d.mesAno]) porMes[d.mesAno] = []
    porMes[d.mesAno].push(d)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Despesas Pendentes</h1>
          <p className="text-sm text-gray-500 mt-1">Contas puladas de meses anteriores ou do mês atual</p>
        </div>
        {totalPendente > 0 && (
          <div className="text-right">
            <div className="text-xs text-gray-400 uppercase font-semibold tracking-wide">Total pendente</div>
            <div className="text-2xl font-bold text-despesa mt-0.5">{brl(totalPendente)}</div>
            <div className="text-xs text-gray-400 mt-0.5">{pulados.length} {pulados.length === 1 ? 'item' : 'itens'}</div>
          </div>
        )}
      </div>

      {pulados.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-base font-semibold text-gray-700 mb-1">Nenhuma despesa pendente</h2>
          <p className="text-sm text-gray-400">
            Quando você pular uma conta usando o botão × no Mensal, ela aparece aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porMes).map(([mesAno, items]) => {
            const totalMes = items.reduce((s, d) => s + d.valorPago, 0)
            return (
              <div key={mesAno} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Header do grupo */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">📅 {mesLabel(mesAno)}</span>
                    <span className="text-xs bg-despesa/10 text-despesa px-2 py-0.5 rounded-full font-medium">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-despesa">{brl(totalMes)}</span>
                </div>

                {/* Itens */}
                <div className="divide-y divide-gray-100">
                  {items.map(d => {
                    const descricao = getDescricao(d.referenceId, d.type)
                    const categoria = getCategoria(d.referenceId, d.type)
                    return (
                      <div key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                        {/* Ícone de pendente */}
                        <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800">{descricao}</div>
                          <div className="text-xs text-gray-400">{categoria} · pulado de {mesLabel(mesAno)}</div>
                        </div>

                        <div className="text-sm font-semibold text-despesa">{brl(d.valorPago)}</div>

                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[d.type]}`}>
                          {TYPE_LABEL[d.type]}
                        </span>

                        {/* Ações */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePagar(d.referenceId, d.type, d.mesAno, d.valorPago)}
                            title="Marcar como pago"
                            className="text-xs px-2.5 py-1 bg-receita/15 text-receita rounded-lg hover:bg-receita/25 transition-colors font-medium"
                          >
                            ✓ Pagar
                          </button>
                          <button
                            onClick={() => handleDesfazer(d.referenceId, d.mesAno)}
                            title="Devolver ao mês original"
                            className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            ↩ Devolver
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer do grupo: pagar todos */}
                {items.length > 1 && (
                  <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                      onClick={() => items.forEach(d => handlePagar(d.referenceId, d.type, d.mesAno, d.valorPago))}
                      className="text-xs px-3 py-1.5 bg-receita/15 text-receita rounded-lg hover:bg-receita/25 transition-colors font-medium"
                    >
                      ✓ Pagar todos de {mesLabel(mesAno)}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
