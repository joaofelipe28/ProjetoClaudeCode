import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

from config import COLORS, EXPENSE_COLORS
from data.investments_editor import load_investments, load_inv_historico


def _fmt_brl(v):
    if v is None:
        return "R$ –"
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def render(data):
    st.header("Visão Geral 2026")

    kpis = data.kpis
    reserva_alvo = kpis.get("reserva_alvo", 24858.9)

    # Load investment data for overview integration
    xlsx_path = st.session_state.get("xlsx_path_current", "")
    patrimonio_investido = 0.0
    try:
        hist_df = load_inv_historico(xlsx_path)
        if not hist_df.empty and "Saldo Final (R$)" in hist_df.columns:
            saldos = pd.to_numeric(hist_df["Saldo Final (R$)"], errors="coerce").dropna()
            if not saldos.empty:
                patrimonio_investido = float(saldos.iloc[-1])
        if patrimonio_investido == 0.0:
            inv_df = load_investments(xlsx_path)
            if not inv_df.empty and "Saldo Atual" in inv_df.columns:
                patrimonio_investido = float(pd.to_numeric(inv_df["Saldo Atual"], errors="coerce").fillna(0).sum())
    except Exception:
        pass

    reserva_atual = patrimonio_investido
    progresso = min(reserva_atual / reserva_alvo, 1.0) if reserva_alvo else 0.0

    # KPI cards — 7 cols when investments tracked, 6 otherwise
    if patrimonio_investido > 0:
        col1, col2, col3, col4, col5, col6, col7 = st.columns(7)
    else:
        col1, col2, col3, col4, col5, col6 = st.columns(6)
        col7 = None

    with col1:
        st.metric("Saldo Atual", _fmt_brl(kpis.get("saldo_inicial", 0)))
    with col2:
        st.metric("Break-even Mensal", _fmt_brl(kpis.get("break_even", 0)))
    with col3:
        st.metric("Fixo Mensal", _fmt_brl(kpis.get("fixo_mensal", 0)))
    with col4:
        runway = kpis.get("runway", 0)
        st.metric("Runway (meses)", f"{runway:.2f}")
    with col5:
        st.metric("Reserva-alvo", _fmt_brl(reserva_alvo))
        st.progress(progresso)
    with col6:
        st.metric("Saldo Projetado Dez/26", _fmt_brl(kpis.get("saldo_dez", 0)))
    if col7:
        with col7:
            st.metric("Patrimônio Investido", _fmt_brl(patrimonio_investido))

    st.divider()

    # Monthly summary table + charts
    df = data.monthly_summary
    if df.empty:
        st.warning("Dados do resumo mensal não encontrados.")
        return

    # Numeric coercion
    numeric_cols = ["Receitas", "Parc. PJ", "DARF", "Fixos", "Parcelas", "Pontuais",
                    "Total Despesas", "Saldo do Mês", "Saldo Acumulado", "% Comprometido"]
    for c in numeric_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    # Table with styling
    st.subheader("Resumo Mensal")

    def _color_status(val):
        if "Saudável" in str(val):
            return "color: #2ecc71; font-weight: bold"
        if "Construindo" in str(val):
            return "color: #f1c40f; font-weight: bold"
        return ""

    def _color_pct(val):
        try:
            v = float(val)
            if v > 0.9:
                return "color: #e74c3c; font-weight: bold"
            if v > 0.8:
                return "color: #f1c40f"
            return "color: #2ecc71"
        except (ValueError, TypeError):
            return ""

    display_df = df.copy()
    for c in ["Receitas", "Parc. PJ", "DARF", "Fixos", "Parcelas", "Pontuais",
              "Total Despesas", "Saldo do Mês", "Saldo Acumulado"]:
        if c in display_df.columns:
            display_df[c] = display_df[c].apply(lambda v: _fmt_brl(v) if v != 0 else "–")

    if "% Comprometido" in display_df.columns:
        display_df["% Comprometido"] = df["% Comprometido"].apply(
            lambda v: f"{v:.1%}" if v != 0 else "–"
        )

    styled = display_df.style.applymap(_color_status, subset=["Status"]) \
                              .applymap(_color_pct, subset=["% Comprometido"])
    st.dataframe(styled, use_container_width=True, hide_index=True)

    st.divider()

    # Two charts side by side
    months_data = df[df["Mês"].str.contains("/26", na=False)].copy()
    if months_data.empty:
        months_data = df[~df["Mês"].str.contains("TOTAL", case=False, na=True)].copy()

    col_left, col_right = st.columns([3, 2])

    with col_left:
        st.subheader("Receitas × Despesas por Mês")
        fig_bar = go.Figure()
        fig_bar.add_trace(go.Bar(
            name="Receitas", x=months_data["Mês"], y=months_data["Receitas"],
            marker_color=COLORS["receita"], opacity=0.9,
        ))
        for cat, col_name, color in [
            ("Fixos", "Fixos", COLORS["fixos"]),
            ("Parcelas", "Parcelas", COLORS["parcelas"]),
            ("DARF", "DARF", COLORS["darf"]),
            ("Pontuais", "Pontuais", COLORS["pontuais"]),
            ("Parc. PJ", "Parc. PJ", COLORS["pj_parcelas"]),
        ]:
            if col_name in months_data.columns:
                fig_bar.add_trace(go.Bar(
                    name=cat, x=months_data["Mês"], y=months_data[col_name],
                    marker_color=color, opacity=0.85,
                ))
        fig_bar.update_layout(
            barmode="group", height=350,
            legend=dict(orientation="h", y=-0.25),
            margin=dict(l=0, r=0, t=20, b=0),
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    with col_right:
        st.subheader("Composição das Despesas")
        exp = data.expense_composition
        if not exp.empty:
            fig_donut = go.Figure(go.Pie(
                labels=exp["Categoria"],
                values=exp["Total"],
                hole=0.55,
                marker_colors=EXPENSE_COLORS,
                textinfo="label+percent",
                textfont_size=11,
            ))
            fig_donut.update_layout(
                height=350,
                showlegend=False,
                margin=dict(l=0, r=0, t=20, b=0),
                paper_bgcolor="rgba(0,0,0,0)",
                font_color="#fafafa",
            )
            st.plotly_chart(fig_donut, use_container_width=True)

    st.divider()

    # Accumulated balance line chart
    st.subheader("Saldo Acumulado ao Longo do Ano")
    if "Saldo Acumulado" in months_data.columns:
        fig_line = go.Figure()
        fig_line.add_trace(go.Scatter(
            x=months_data["Mês"], y=months_data["Saldo Acumulado"],
            mode="lines+markers+text",
            line=dict(color=COLORS["saldo"], width=3),
            marker=dict(size=8),
            text=[_fmt_brl(v) for v in months_data["Saldo Acumulado"]],
            textposition="top center",
            textfont=dict(size=10),
            name="Saldo Acumulado",
        ))
        # Reserva-alvo dashed line
        fig_line.add_hline(
            y=reserva_alvo, line_dash="dash", line_color=COLORS["alerta"],
            annotation_text=f"Reserva-alvo ({_fmt_brl(reserva_alvo)})",
            annotation_position="bottom right",
        )
        # Break-even dashed line
        break_even = kpis.get("break_even", 0)
        fig_line.add_hline(
            y=break_even, line_dash="dot", line_color="#95a5a6",
            annotation_text=f"Break-even ({_fmt_brl(break_even)})",
            annotation_position="top right",
        )
        fig_line.update_layout(
            height=300,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
            margin=dict(l=0, r=0, t=20, b=0),
            showlegend=False,
        )
        st.plotly_chart(fig_line, use_container_width=True)

    # Fixos breakdown
    st.divider()
    st.subheader("Gastos Fixos Mensais")
    fixos = data.fixos
    if not fixos.empty:
        col_a, col_b = st.columns([2, 3])
        with col_a:
            display_fixos = fixos.copy()
            display_fixos["Valor"] = display_fixos["Valor"].apply(_fmt_brl)
            st.dataframe(display_fixos[["Descrição", "Categoria", "Valor"]], use_container_width=True, hide_index=True)
        with col_b:
            cat_totals = fixos.groupby("Categoria")["Valor"].sum().reset_index()
            fig_fixos = px.bar(
                cat_totals.sort_values("Valor", ascending=True),
                x="Valor", y="Categoria", orientation="h",
                color_discrete_sequence=[COLORS["fixos"]],
                labels={"Valor": "R$", "Categoria": ""},
            )
            fig_fixos.update_layout(
                height=300, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                font_color="#fafafa", margin=dict(l=0, r=0, t=10, b=0),
                xaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
            )
            st.plotly_chart(fig_fixos, use_container_width=True)
