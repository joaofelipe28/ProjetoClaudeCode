import { useState } from 'react'
import { useStore } from '@/store'
import { Modal } from '@/components/ui/Modal'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { Select } from '@/components/ui/Select'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { brl, mesLabel, addMonths } from '@/lib/formatters'
import { getParcelamentoMesFinal, getParcelamentoSaldoRestante, computeFixosTotal } from '@/lib/calculations'
import type { Tomador, GastoFixo, Parcelamento, FixoCategoria, FixoStatus, ParcelamentoStatus } from '@/types'

type SubTab = 'tomadores' | 'fixos' | 'parcelamentos' | 'config'

const CATEGORIA_OPTS: FixoCategoria[] = [
  'Alimentação', 'Bem-estar', 'Comunicação', 'Família', 'Lazer',
  'Moradia', 'Outros', 'Pet', 'PJ operacional', 'Saúde', 'Saúde mental',
  'Trabalho/estudo', 'Transporte',
]

// ── Tomadores Tab ─────────────────────────────────────────────────────────────

function TomadoresTab() {
  const { tomadores, addTomador, updateTomador, deleteTomador } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const EMPTY: Omit<Tomador, 'id'> = { nome: '', tipo: 'PJ', retemIss: false, retemIrpj: false, tipoReceita: 'Consultório', valorPrevisto: 0, isVariavel: true, ativo: true }
  const [form, setForm] = useState<Omit<Tomador, 'id'>>(EMPTY)

  function openAdd() { setEditId(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(t: Tomador) { const { id, ...rest } = t; setEditId(id); setForm(rest); setShowForm(true) }
  function handleSave() {
    if (!form.nome) return
    if (editId) updateTomador(editId, form)
    else addTomador(form)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">{tomadores.length} tomadores cadastrados</p>
        <button onClick={openAdd} className="text-xs bg-saldo/20 text-saldo px-3 py-1.5 rounded-lg hover:bg-saldo/30">+ Novo tomador</button>
      </div>
      <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bdr">
              {['Nome', 'Tipo', 'Receita', 'Valor Previsto', 'Variável', 'Retém ISS', 'Retém IRPJ', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tomadores.map(t => (
              <tr key={t.id} className="border-b border-bdr/50 hover:bg-white/5">
                <td className="px-4 py-2.5 font-medium text-gray-200">{t.nome}</td>
                <td className="px-4 py-2.5 text-gray-400">{t.tipo}</td>
                <td className="px-4 py-2.5 text-gray-400">{t.tipoReceita}</td>
                <td className="px-4 py-2.5 text-gray-300">{t.valorPrevisto > 0 ? brl(t.valorPrevisto) : '—'}</td>
                <td className="px-4 py-2.5 text-gray-400">{t.isVariavel ? 'Sim' : 'Não'}</td>
                <td className="px-4 py-2.5">{t.retemIss ? <span className="text-alerta">Sim</span> : <span className="text-gray-600">Não</span>}</td>
                <td className="px-4 py-2.5">{t.retemIrpj ? <span className="text-alerta">Sim</span> : <span className="text-gray-600">Não</span>}</td>
                <td className="px-4 py-2.5"><StatusBadge status={t.ativo ? 'Ativo' : 'Pausado'} /></td>
                <td className="px-4 py-2.5 flex gap-2">
                  <button onClick={() => openEdit(t)} className="text-gray-400 hover:text-saldo text-xs">✎</button>
                  <button onClick={() => deleteTomador(t.id)} className="text-gray-400 hover:text-despesa text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Tomador' : 'Novo Tomador'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nome</label>
            <input type="text" className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo</label>
              <Select value={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v as 'PJ' | 'PF' }))}
                options={[{ value: 'PJ', label: 'PJ' }, { value: 'PF', label: 'PF' }]} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo Receita</label>
              <Select value={form.tipoReceita} onChange={v => setForm(f => ({ ...f, tipoReceita: v as Tomador['tipoReceita'] }))}
                options={['Plantão', 'Consultório', 'Salário', 'Outros'].map(v => ({ value: v, label: v }))} className="w-full" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Valor Previsto Mensal</label>
            <CurrencyInput value={form.valorPrevisto} onChange={v => setForm(f => ({ ...f, valorPrevisto: v }))} className="w-full" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.isVariavel} onChange={e => setForm(f => ({ ...f, isVariavel: e.target.checked }))} className="accent-saldo" />
              Receita variável
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.retemIss} onChange={e => setForm(f => ({ ...f, retemIss: e.target.checked }))} className="accent-saldo" />
              Retém ISS
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={form.retemIrpj} onChange={e => setForm(f => ({ ...f, retemIrpj: e.target.checked }))} className="accent-saldo" />
              Retém IRPJ/PIS/COFINS/CSLL
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} className="accent-saldo" />
            Ativo
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-bdr text-gray-400 text-sm">Cancelar</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-saldo text-gray-900 font-medium text-sm">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Fixos Tab ─────────────────────────────────────────────────────────────────

function FixosTab() {
  const { fixos, addFixo, updateFixo, deleteFixo } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const EMPTY: Omit<GastoFixo, 'id'> = { descricao: '', categoria: 'Outros', valor: 0, status: 'Ativo' }
  const [form, setForm] = useState<Omit<GastoFixo, 'id'>>(EMPTY)

  const total = computeFixosTotal(fixos)

  function openAdd() { setEditId(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(f: GastoFixo) { const { id, ...rest } = f; setEditId(id); setForm(rest); setShowForm(true) }
  function handleSave() {
    if (!form.descricao || form.valor <= 0) return
    if (editId) updateFixo(editId, form)
    else addFixo(form)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">Total ativo: <span className="text-despesa font-medium">{brl(total)}/mês</span></p>
        <button onClick={openAdd} className="text-xs bg-saldo/20 text-saldo px-3 py-1.5 rounded-lg hover:bg-saldo/30">+ Nova despesa fixa</button>
      </div>
      <div className="bg-surface border border-bdr rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-bdr">
              {['Descrição', 'Categoria', 'Valor', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fixos.map(f => (
              <tr key={f.id} className="border-b border-bdr/50 hover:bg-white/5">
                <td className="px-4 py-2.5 text-gray-200">{f.descricao}</td>
                <td className="px-4 py-2.5 text-gray-400">{f.categoria}</td>
                <td className={`px-4 py-2.5 font-medium ${f.status === 'Ativo' ? 'text-despesa' : 'text-gray-500'}`}>{brl(f.valor)}</td>
                <td className="px-4 py-2.5"><StatusBadge status={f.status} /></td>
                <td className="px-4 py-2.5 flex gap-2">
                  <button onClick={() => updateFixo(f.id, { status: f.status === 'Ativo' ? 'Pausado' : 'Ativo' as FixoStatus })}
                    className="text-xs text-gray-400 hover:text-alerta">{f.status === 'Ativo' ? '⏸' : '▶'}</button>
                  <button onClick={() => openEdit(f)} className="text-gray-400 hover:text-saldo text-xs">✎</button>
                  <button onClick={() => deleteFixo(f.id)} className="text-gray-400 hover:text-despesa text-xs">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <input type="text" className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Categoria</label>
            <Select value={form.categoria} onChange={v => setForm(f => ({ ...f, categoria: v as FixoCategoria }))}
              options={CATEGORIA_OPTS.map(c => ({ value: c, label: c }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Valor</label>
            <CurrencyInput value={form.valor} onChange={v => setForm(f => ({ ...f, valor: v }))} className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <Select value={form.status} onChange={v => setForm(f => ({ ...f, status: v as FixoStatus }))}
              options={['Ativo', 'Pausado', 'Cancelado'].map(s => ({ value: s, label: s }))} className="w-full" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-bdr text-gray-400 text-sm">Cancelar</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-saldo text-gray-900 font-medium text-sm">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Parcelamentos Tab ─────────────────────────────────────────────────────────

function ParcelamentosTab() {
  const { parcelamentos, config, addParcelamento, updateParcelamento, deleteParcelamento } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const EMPTY: Omit<Parcelamento, 'id'> = { descricao: '', tipo: 'Pessoal', valorParcela: 0, totalParcelas: 12, mesInicio: config.mesAtual, status: 'Ativo' }
  const [form, setForm] = useState<Omit<Parcelamento, 'id'>>(EMPTY)

  function openAdd() { setEditId(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(p: Parcelamento) { const { id, ...rest } = p; setEditId(id); setForm(rest); setShowForm(true) }
  function handleSave() {
    if (!form.descricao || form.valorParcela <= 0) return
    if (editId) updateParcelamento(editId, form)
    else addParcelamento(form)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">{parcelamentos.length} parcelamentos</p>
        <button onClick={openAdd} className="text-xs bg-saldo/20 text-saldo px-3 py-1.5 rounded-lg hover:bg-saldo/30">+ Novo parcelamento</button>
      </div>

      {['PJ', 'Pessoal'].map(tipo => {
        const list = parcelamentos.filter(p => p.tipo === tipo)
        if (list.length === 0) return null
        return (
          <div key={tipo} className="bg-surface border border-bdr rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-bdr">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{tipo}</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bdr">
                  {['Descrição', 'Parcela', 'Nº Parcelas', 'Início', 'Final', 'Saldo Restante', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-b border-bdr/50 hover:bg-white/5">
                    <td className="px-4 py-2.5 text-gray-200">{p.descricao}</td>
                    <td className={`px-4 py-2.5 font-medium ${p.tipo === 'PJ' ? 'text-pjParcela' : 'text-parcela'}`}>{brl(p.valorParcela)}</td>
                    <td className="px-4 py-2.5 text-gray-400">{p.totalParcelas}×</td>
                    <td className="px-4 py-2.5 text-gray-400">{mesLabel(p.mesInicio)}</td>
                    <td className="px-4 py-2.5 text-gray-400">{mesLabel(getParcelamentoMesFinal(p))}</td>
                    <td className="px-4 py-2.5 text-gray-300">{brl(getParcelamentoSaldoRestante(p, config.mesAtual))}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-2.5 flex gap-2">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-saldo text-xs">✎</button>
                      <button onClick={() => deleteParcelamento(p.id)} className="text-gray-400 hover:text-despesa text-xs">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Editar Parcelamento' : 'Novo Parcelamento'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descrição</label>
            <input type="text" className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo</label>
              <Select value={form.tipo} onChange={v => setForm(f => ({ ...f, tipo: v as 'PJ' | 'Pessoal' }))}
                options={[{ value: 'PJ', label: 'PJ' }, { value: 'Pessoal', label: 'Pessoal' }]} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Valor da parcela</label>
              <CurrencyInput value={form.valorParcela} onChange={v => setForm(f => ({ ...f, valorParcela: v }))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Número de parcelas</label>
              <input type="number" min="1" className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
                value={form.totalParcelas} onChange={e => setForm(f => ({ ...f, totalParcelas: parseInt(e.target.value) || 1 }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Mês início (YYYY-MM)</label>
              <input type="month" className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
                value={form.mesInicio} onChange={e => setForm(f => ({ ...f, mesInicio: e.target.value }))} />
            </div>
          </div>
          {form.descricao && form.valorParcela > 0 && (
            <div className="text-xs text-gray-400 bg-surfaceAlt rounded-lg p-3">
              Total: <span className="text-gray-200 font-medium">{brl(form.valorParcela * form.totalParcelas)}</span>
              {' · '}Término: <span className="text-gray-200">{mesLabel(addMonths(form.mesInicio, form.totalParcelas - 1))}</span>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Status</label>
            <Select value={form.status} onChange={v => setForm(f => ({ ...f, status: v as ParcelamentoStatus }))}
              options={['Ativo', 'Quitado', 'Suspenso'].map(s => ({ value: s, label: s }))} className="w-full" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-bdr text-gray-400 text-sm">Cancelar</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-saldo text-gray-900 font-medium text-sm">Salvar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Config Tab ────────────────────────────────────────────────────────────────

function ConfigTab() {
  const { config, updateConfig, updateTaxConfig, exportData, importData, resetToDefaults } = useStore()
  const [jsonInput, setJsonInput] = useState('')

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-surface border border-bdr rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Configurações Gerais</h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Saldo inicial (Mai/26)</label>
          <CurrencyInput value={config.saldoInicial} onChange={v => updateConfig({ saldoInicial: v })} className="w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Meta reserva (meses de fixos)</label>
          <input type="number" min="1" max="12"
            className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
            value={config.reservaMesesAlvo}
            onChange={e => updateConfig({ reservaMesesAlvo: parseInt(e.target.value) || 3 })} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Alerta de comprometimento (%)</label>
          <input type="number" min="50" max="100" step="5"
            className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
            value={Math.round(config.limiteAlerta * 100)}
            onChange={e => updateConfig({ limiteAlerta: (parseInt(e.target.value) || 90) / 100 })} />
        </div>
      </div>

      <div className="bg-surface border border-bdr rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Alíquotas Lucro Presumido</h3>
        {([
          ['PIS', 'pis', 0.65],
          ['COFINS', 'cofins', 3],
          ['IRPJ', 'irpj', 4.8],
          ['CSLL', 'csll', 2.88],
          ['ISS', 'iss', 2],
        ] as [string, keyof typeof config.taxConfig, number][]).map(([label, key, ref]) => (
          <div key={key} className="flex items-center gap-4">
            <label className="w-24 text-xs text-gray-400">{label} (ref: {ref}%)</label>
            <input type="number" step="0.01" min="0" max="100"
              className="w-28 bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-saldo/50"
              value={(config.taxConfig[key] * 100).toFixed(2)}
              onChange={e => updateTaxConfig({ [key]: (parseFloat(e.target.value) || 0) / 100 })} />
            <span className="text-xs text-gray-500">→ {(config.taxConfig[key] * 100).toFixed(2)}%</span>
          </div>
        ))}
        <div className="text-xs text-gray-500 pt-1">
          Total efetivo: {((config.taxConfig.pis + config.taxConfig.cofins + config.taxConfig.irpj + config.taxConfig.csll + config.taxConfig.iss) * 100).toFixed(2)}%
        </div>
      </div>

      <div className="bg-surface border border-bdr rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Backup / Restauração</h3>
        <button
          onClick={() => {
            const data = exportData()
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url; a.download = 'painel-financeiro-backup.json'; a.click()
            URL.revokeObjectURL(url)
          }}
          className="w-full px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
        >
          ↓ Exportar dados (JSON)
        </button>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Importar JSON</label>
          <textarea
            className="w-full bg-surfaceAlt border border-bdr rounded-lg px-3 py-2 text-xs text-gray-300 h-24 focus:outline-none focus:border-saldo/50"
            value={jsonInput}
            onChange={e => setJsonInput(e.target.value)}
            placeholder='Cole o JSON do backup aqui...'
          />
          <button
            onClick={() => { importData(jsonInput); setJsonInput('') }}
            className="mt-2 w-full px-4 py-2 rounded-lg bg-saldo/20 text-saldo text-sm hover:bg-saldo/30 transition-colors"
          >
            ↑ Importar
          </button>
        </div>
        <button
          onClick={() => { if (window.confirm('Resetar todos os dados para os valores padrão da planilha?')) resetToDefaults() }}
          className="w-full px-4 py-2 rounded-lg bg-despesa/10 text-despesa text-sm hover:bg-despesa/20 transition-colors"
        >
          ⚠ Resetar para padrões
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SUBTABS: { id: SubTab; label: string }[] = [
  { id: 'tomadores', label: 'Tomadores' },
  { id: 'fixos', label: 'Gastos Fixos' },
  { id: 'parcelamentos', label: 'Parcelamentos' },
  { id: 'config', label: 'Configurações' },
]

export function Gerenciar() {
  const [sub, setSub] = useState<SubTab>('tomadores')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Gerenciar</h1>
        <p className="text-sm text-gray-400 mt-1">CRUD de tomadores, despesas fixas, parcelamentos e configurações</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-bdr pb-3">
        {SUBTABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sub === t.id ? 'bg-saldo/20 text-saldo' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === 'tomadores' && <TomadoresTab />}
      {sub === 'fixos' && <FixosTab />}
      {sub === 'parcelamentos' && <ParcelamentosTab />}
      {sub === 'config' && <ConfigTab />}
    </div>
  )
}
