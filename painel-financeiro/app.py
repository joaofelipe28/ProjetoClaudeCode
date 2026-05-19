import streamlit as st
import pandas as pd
import os

from config import XLSX_PATH, MONTHS, MONTH_LABELS
from data.loader import load
from data.editor import save_pontuais_mes
from data.reconciler import ALL_CATEGORIES
from views import overview, monthly_detail, revenue, cashflow, extrato, editor
from views import metas, investments

st.set_page_config(
    page_title="Painel Financeiro — João Felipe",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Sidebar
with st.sidebar:
    st.title("📊 Painel Financeiro")
    st.caption("João Felipe Scheidt — 2026")
    st.divider()

    xlsx_path = st.text_input(
        "Caminho do arquivo .xlsx",
        value=XLSX_PATH,
        help="Baixe do Google Sheets e coloque na pasta Downloads. O app recarrega automaticamente.",
    )

    if not os.path.exists(xlsx_path):
        st.error(f"Arquivo não encontrado:\n{xlsx_path}")
        st.stop()

    if st.button("🔄 Recarregar dados", use_container_width=True):
        st.cache_data.clear()

    st.divider()
    st.caption("Mês selecionado")
    selected_month_idx = st.radio(
        "Mês",
        options=range(len(MONTHS)),
        format_func=lambda i: MONTH_LABELS[i],
        label_visibility="collapsed",
    )
    selected_month_key = MONTHS[selected_month_idx]

    st.divider()
    st.caption("Última atualização dos dados:")
    try:
        mtime = os.path.getmtime(xlsx_path)
        from datetime import datetime
        st.caption(datetime.fromtimestamp(mtime).strftime("%d/%m/%Y %H:%M"))
    except Exception:
        st.caption("–")

# Load data
try:
    data = load(xlsx_path)
except Exception as e:
    st.error(f"Erro ao carregar planilha: {e}")
    st.stop()

# Pass xlsx path to session state
st.session_state["xlsx_path_current"] = xlsx_path

# ── Quick-add gasto avulso (sidebar) ─────────────────────────────────────────
with st.sidebar:
    st.divider()
    with st.expander("⚡ Lançar gasto avulso"):
        qa_desc = st.text_input("Descrição", key="qa_desc", placeholder="Ex: Consulta médica")
        qa_cat = st.selectbox("Categoria", options=ALL_CATEGORIES, key="qa_cat")
        qa_val = st.number_input("Valor (R$)", min_value=0.0, step=10.0, format="%.2f", key="qa_val")
        qa_status = st.selectbox("Status", options=["Confirmado", "Previsto"], key="qa_status")

        if st.button("➕ Adicionar", key="qa_btn", use_container_width=True, type="primary"):
            if qa_desc.strip() and qa_val > 0:
                month_data = data.months.get(selected_month_key)
                existing = month_data.pontuais.copy() if (month_data and not month_data.pontuais.empty) else pd.DataFrame(
                    columns=["Descrição", "Categoria", "Valor", "Status"]
                )
                new_row = pd.DataFrame([{
                    "Descrição": qa_desc.strip(),
                    "Categoria": qa_cat,
                    "Valor": qa_val,
                    "Status": qa_status,
                }])
                merged = pd.concat([existing, new_row], ignore_index=True)
                try:
                    save_pontuais_mes(xlsx_path, selected_month_key, merged)
                    st.cache_data.clear()
                    st.success(f"Adicionado a {MONTH_LABELS[selected_month_idx]}!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Erro: {e}")
            else:
                st.warning("Preencha descrição e valor.")

# Tabs
tab1, tab2, tab3, tab4, tab5, tab6, tab7, tab8 = st.tabs([
    "📊 Visão Geral",
    "📅 Mês a Mês",
    "💼 Receitas PJ",
    "💰 Fluxo de Caixa",
    "📋 Extrato",
    "✏️ Editar",
    "🎯 Metas",
    "📈 Investimentos",
])

with tab1:
    overview.render(data)

with tab2:
    monthly_detail.render(data, selected_month_key)

with tab3:
    revenue.render(data)

with tab4:
    cashflow.render(data)

with tab5:
    extrato.render(data, selected_month_key)

with tab6:
    editor.render(data)

with tab7:
    metas.render()

with tab8:
    investments.render()
