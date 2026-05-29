interface StatusBadgeProps {
  status: string
}

const config: Record<string, string> = {
  Pago: 'bg-receita/15 text-receita',
  Previsto: 'bg-blue-100 text-blue-600',
  Pendente: 'bg-alerta/15 text-alerta',
  Cancelado: 'bg-gray-100 text-gray-500',
  Ativo: 'bg-receita/15 text-receita',
  Pausado: 'bg-alerta/15 text-alerta',
  Quitado: 'bg-gray-100 text-gray-500',
  Suspenso: 'bg-gray-100 text-gray-500',
  Saudável: 'bg-receita/15 text-receita',
  Alerta: 'bg-alerta/15 text-alerta',
  Crítico: 'bg-despesa/15 text-despesa',
  Confirmado: 'bg-receita/15 text-receita',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls = config[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}
