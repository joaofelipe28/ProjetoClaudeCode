interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  color?: 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'teal' | 'default'
  icon?: string
  trend?: { value: string; up: boolean }
}

const colorMap = {
  green: 'text-receita border-receita/20 bg-receita/5',
  red: 'text-despesa border-despesa/20 bg-despesa/5',
  orange: 'text-parcela border-parcela/20 bg-parcela/5',
  blue: 'text-pjParcela border-pjParcela/20 bg-pjParcela/5',
  purple: 'text-darf border-darf/20 bg-darf/5',
  teal: 'text-saldo border-saldo/20 bg-saldo/5',
  default: 'text-gray-700 border-gray-200 bg-white',
}

export function KpiCard({ title, value, subtitle, color = 'default', icon, trend }: KpiCardProps) {
  const cls = colorMap[color]
  return (
    <div className={`rounded-xl border p-4 ${cls} flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
      {trend && (
        <div className={`text-xs font-medium ${trend.up ? 'text-receita' : 'text-despesa'}`}>
          {trend.up ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </div>
  )
}
