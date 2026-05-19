interface StatusBadgeProps {
  status: string
}

const config: Record<string, string> = {
  Pago: 'bg-receita/20 text-receita',
  Previsto: 'bg-blue-500/20 text-blue-400',
  Pendente: 'bg-alerta/20 text-alerta',
  Cancelado: 'bg-gray-700 text-gray-400',
  Ativo: 'bg-receita/20 text-receita',
  Pausado: 'bg-alerta/20 text-alerta',
  Quitado: 'bg-gray-700 text-gray-400',
  Suspenso: 'bg-gray-700 text-gray-400',
  Saudável: 'bg-receita/20 text-receita',
  Alerta: 'bg-alerta/20 text-alerta',
  Crítico: 'bg-despesa/20 text-despesa',
  Confirmado: 'bg-receita/20 text-receita',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = config[status] ?? 'bg-gray-700 text-gray-300'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
