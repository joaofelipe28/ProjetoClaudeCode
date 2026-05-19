import streamlit as st
import pandas as pd
from datetime import date
from typing import Optional

from data.metas_editor import load_metas, save_metas, METAS_HEADERS

METAS_CATEGORIAS = ["Dívida", "Reserva", "Investimento", "Consumo", "Viagem", "Outros"]
METAS_STATUS = ["Em andamento", "Concluída", "Pausada", "Cancelada"]

MESES_LABEL = {
    "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
    "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12,
}


def _fmt_brl(v):
    try:
        return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "–"


def _progress_color(pct: float) -> str:
    if pct >= 0.8:
        return "#2ecc71"
    if pct >= 0.4:
        return "#f1c40f"
    return "#e74c3c"


def _days_remaining(prazo_str: str) -> Optional[int]:
    if not prazo_str or not isinstance(prazo_str, str):
        return None
    try:
        parts = prazo_str.strip().split("/")
        if len(parts) == 2:
            mes_label, ano = parts[0].strip(), int(parts[1].strip())
            mes = MESES_LABEL.get(mes_label, 0)
            if mes:
                target = date(ano, mes, 28)
                return (target - date.today()).days
    except Exception:
        pass
    return None


def render():
    st.header("🎯 Metas Financeiras")
    st.caption("Defina objetivos e acompanhe o progresso. Exemplos: quitar dívida, atingir reserva de emergência, acumular para investimento.")

    xlsx_path = st.session_state.get("xlsx_path_current", "")
    if not xlsx_path:
        st.error("Caminho do xlsx não encontrado. Verifique o sidebar.")
        return

    df = load_metas(xlsx_path)

    # Ensure correct column types
    for col in ["Descrição", "Categoria", "Prazo", "Status"]:
        if col not in df.columns:
            df[col] = ""
        else:
            df[col] = df[col].fillna("").astype(str)
    for col in ["Valor Alvo", "Valor Atual"]:
        if col not in df.columns:
            df[col] = 0.0
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    # ── Progress cards for active goals ──────────────────────────────────────
    active = df[~df["Status"].isin(["Concluída", "Cancelada"]) & (df["Descrição"] != "")]
    if not active.empty:
        st.subheader("Progresso das Metas")
        cols = st.columns(min(len(active), 3))
        for i, (_, row) in enumerate(active.iterrows()):
            alvo = float(row.get("Valor Alvo", 0) or 0)
            atual = float(row.get("Valor Atual", 0) or 0)
            pct = min(atual / alvo, 1.0) if alvo > 0 else 0.0
            dias = _days_remaining(str(row.get("Prazo", "")))

            with cols[i % 3]:
                cat = row.get("Categoria", "")
                cat_icon = {"Dívida": "💳", "Reserva": "🛡️", "Investimento": "📈", "Consumo": "🛒", "Viagem": "✈️"}.get(cat, "🎯")
                st.markdown(f"**{cat_icon} {row['Descrição']}**")

                color = _progress_color(pct)
                st.markdown(
                    f"""
                    <div style="background:#1c2333;border-radius:8px;padding:12px;margin-bottom:4px">
                      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                        <span style="font-size:13px;color:#aaa">{_fmt_brl(atual)} / {_fmt_brl(alvo)}</span>
                        <span style="font-size:14px;font-weight:bold;color:{color}">{pct:.0%}</span>
                      </div>
                      <div style="background:#2a3444;border-radius:4px;height:10px">
                        <div style="background:{color};width:{pct*100:.1f}%;height:10px;border-radius:4px"></div>
                      </div>
                      <div style="margin-top:6px;font-size:11px;color:#888">
                        {f"⏳ {dias} dias restantes" if dias is not None and dias >= 0 else ("✅ Prazo encerrado" if dias is not None else f"Prazo: {row.get('Prazo', '—')}")}
                      </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )

        st.divider()

    # ── Editable goals table ──────────────────────────────────────────────────
    st.subheader("Gerenciar Metas")
    st.caption("Adicione, edite ou remova metas. Prazo no formato: Dez/2026")

    edited = st.data_editor(
        df[METAS_HEADERS] if not df.empty else pd.DataFrame(columns=METAS_HEADERS),
        use_container_width=True,
        hide_index=True,
        num_rows="dynamic",
        column_config={
            "Descrição": st.column_config.TextColumn("Descrição", width="large"),
            "Categoria": st.column_config.SelectboxColumn("Categoria", options=METAS_CATEGORIAS),
            "Valor Alvo": st.column_config.NumberColumn("Alvo (R$)", format="R$ %.2f"),
            "Valor Atual": st.column_config.NumberColumn("Atual (R$)", format="R$ %.2f"),
            "Prazo": st.column_config.TextColumn("Prazo (ex: Dez/2026)"),
            "Status": st.column_config.SelectboxColumn("Status", options=METAS_STATUS),
        },
        key="metas_editor",
    )

    if st.button("💾 Salvar Metas", key="save_metas", type="primary", use_container_width=True):
        try:
            save_metas(xlsx_path, edited)
            st.cache_data.clear()
            st.success("Metas salvas!")
            st.rerun()
        except Exception as e:
            st.error(f"Erro ao salvar: {e}")
