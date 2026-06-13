// ── Status de salvamento ────────────────────────────────────────────────────
// Pequeno observável que o storage atualiza a cada gravação. O indicador no
// header escuta isso para mostrar "Salvando…" / "Salvo ✓" / "Erro ao salvar".

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface Snapshot { state: SaveState; lastSavedAt: number | null }

// Snapshot cacheado: só troca de referência quando algo muda de verdade.
// Necessário para useSyncExternalStore não entrar em loop infinito.
let snapshot: Snapshot = { state: 'idle', lastSavedAt: null }
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}

export const saveStatus = {
  get(): Snapshot {
    return snapshot
  },
  set(next: SaveState) {
    snapshot = {
      state: next,
      lastSavedAt: next === 'saved' ? Date.now() : snapshot.lastSavedAt,
    }
    emit()
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
