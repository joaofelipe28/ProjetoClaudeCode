import streamlit as st
import os

from config import XLSX_PATH, MONTHS, MONTH_LABELS
from data.loader import load
from views import overview, monthly_detail, revenue, cashflow

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
    st.caption("Mês selecionado (Detalhes)")
    month_labels_display = [MONTH_LABELS[i] for i in range(len(MONTHS))]
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

# Tabs
tab1, tab2, tab3, tab4 = st.tabs([
    "📊 Visão Geral",
    "📅 Mês a Mês",
    "💼 Receitas PJ",
    "💰 Fluxo de Caixa",
])

with tab1:
    overview.render(data)

with tab2:
    monthly_detail.render(data, selected_month_key)

with tab3:
    revenue.render(data)

with tab4:
    cashflow.render(data)
