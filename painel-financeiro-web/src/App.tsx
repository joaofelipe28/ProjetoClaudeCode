import { useState } from 'react'
import { Dashboard } from '@/pages/Dashboard'
import { Mensal } from '@/pages/Mensal'
import { Anual } from '@/pages/Anual'
import { Investimentos } from '@/pages/Investimentos'
import { Gerenciar } from '@/pages/Gerenciar'
import { Pendentes } from '@/pages/Pendentes'
import { SaveIndicator } from '@/components/ui/SaveIndicator'
import { useStore } from '@/store'

type Tab = 'dashboard' | 'mensal' | 'pendentes' | 'anual' | 'investimentos' | 'gerenciar'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'mensal', label: 'Mensal', icon: '📅' },
  { id: 'pendentes', label: 'Pendentes', icon: '⏳' },
  { id: 'anual', label: 'Anual', icon: '📈' },
  { id: 'investimentos', label: 'Investimentos', icon: '💰' },
  { id: 'gerenciar', label: 'Gerenciar', icon: '⚙️' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const { monthlyDebits } = useStore()
  const countPendentes = monthlyDebits.filter(d => d.status === 'Pulado').length

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="border-b border-bdr bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-saldo/15 flex items-center justify-center text-saldo font-bold text-sm">JF</div>
              <span className="font-semibold text-gray-800 text-sm hidden sm:block">Painel Financeiro Pessoal</span>
              <SaveIndicator />
            </div>
            <nav className="flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-saldo/15 text-saldo'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                  {tab.id === 'pendentes' && countPendentes > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-despesa text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {countPendentes > 9 ? '9+' : countPendentes}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'mensal' && <Mensal />}
        {activeTab === 'pendentes' && <Pendentes />}
        {activeTab === 'anual' && <Anual />}
        {activeTab === 'investimentos' && <Investimentos />}
        {activeTab === 'gerenciar' && <Gerenciar />}
      </main>
    </div>
  )
}
