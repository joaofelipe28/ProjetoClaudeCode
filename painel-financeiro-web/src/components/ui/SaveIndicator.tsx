import { useState, useEffect } from 'react'
import { saveStatus, type SaveState } from '@/lib/saveStatus'

export function SaveIndicator() {
  const [state, setState] = useState<SaveState>(() => saveStatus.get().state)

  useEffect(() => {
    return saveStatus.subscribe(() => setState(saveStatus.get().state))
  }, [])

  if (state === 'idle') return null

  const config = {
    saving: { dot: 'bg-alerta animate-pulse', text: 'Salvando…', cls: 'text-gray-500' },
    saved: { dot: 'bg-receita', text: 'Salvo', cls: 'text-receita' },
    error: { dot: 'bg-despesa', text: 'Erro ao salvar — verifique o servidor', cls: 'text-despesa' },
  }[state]

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${config.cls}`} title="Status do salvamento automático">
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span className="hidden sm:inline">{config.text}</span>
    </div>
  )
}
