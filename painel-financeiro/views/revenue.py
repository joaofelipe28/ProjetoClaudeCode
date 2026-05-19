import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd

from config import COLORS


def _fmt_brl(v):
    try:
        return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "–"


def render(data):
    st.header("Receitas PJ")

    fat = data.faturamento
    darf = data.darf_by_month

    if fat.empty:
        st.warning("Dados de faturamento não encontrados.")
        return

    # Identify client columns (everything except Mês and Total)
    client_cols = [c for c in fat.columns if c not in ("Mês", "Total")]

    # Numeric coercion
    for c in client_cols + ["Total"]:
        if c in fat.columns:
            fat[c] = pd.to_numeric(fat[c], errors="coerce").fillna(0)

    col1, col2 = st.columns([3, 2])

    with col1:
        st.subheader("Faturamento por Cliente × Mês")
        # Heatmap
        heat_data = fat.set_index("Mês")[client_cols] if "Mês" in fat.columns else fat[client_cols]
        fig_heat = go.Figure(go.Heatmap(
            z=heat_data.values,
            x=list(heat_data.columns),
            y=list(heat_data.index),
            colorscale=[[0, "#0d2b1a"], [0.5, "#1e6f50"], [1.0, "#2ecc71"]],
            text=heat_data.applymap(lambda v: _fmt_brl(v)).values,
            texttemplate="%{text}",
            textfont=dict(size=10),
            showscale=False,
        ))
        fig_heat.update_layout(
            height=300,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            margin=dict(l=0, r=0, t=20, b=0),
        )
        st.plotly_chart(fig_heat, use_container_width=True)

    with col2:
        st.subheader("Total por Cliente (período)")
        client_totals = fat[client_cols].sum().reset_index()
        client_totals.columns = ["Cliente", "Total"]
        client_totals = client_totals.sort_values("Total", ascending=True)
        fig_bar = px.bar(
            client_totals, x="Total", y="Cliente", orientation="h",
            color_discrete_sequence=[COLORS["receita"]],
            labels={"Total": "R$", "Cliente": ""},
            text=client_totals["Total"].apply(_fmt_brl),
        )
        fig_bar.update_traces(textposition="outside")
        fig_bar.update_layout(
            height=300,
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa", margin=dict(l=0, r=0, t=20, b=0),
            xaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
        )
        st.plotly_chart(fig_bar, use_container_width=True)

    st.divider()

    # DARF section
    st.subheader("DARF — Impostos PJ")

    if not darf.empty:
        darf_display = darf.copy()
        numeric_darf = ["PIS", "COFINS", "IRPJ", "CSLL", "ISS", "Total Bruto",
                        "(-) Retenções", "DARF a Pagar"]
        for c in numeric_darf:
            if c in darf_display.columns:
                darf_display[c] = pd.to_numeric(darf_display[c], errors="coerce").fillna(0)

        col_a, col_b = st.columns([2, 3])

        with col_a:
            # Display table
            show_cols = [c for c in ["Competência", "Mês Pagamento", "DARF a Pagar"] if c in darf_display.columns]
            disp = darf_display[show_cols].copy()
            if "DARF a Pagar" in disp.columns:
                disp["DARF a Pagar"] = darf_display["DARF a Pagar"].apply(_fmt_brl)
            st.dataframe(disp, use_container_width=True, hide_index=True)

        with col_b:
            # Stacked bar of tax components
            tax_cols = [c for c in ["PIS", "COFINS", "IRPJ", "CSLL", "ISS"] if c in darf_display.columns]
            if tax_cols and "Competência" in darf_display.columns:
                fig_darf = go.Figure()
                tax_colors = ["#3498db", "#9b59b6", "#e74c3c", "#e67e22", "#1abc9c"]
                for i, tax in enumerate(tax_cols):
                    fig_darf.add_trace(go.Bar(
                        name=tax,
                        x=darf_display["Competência"],
                        y=darf_display[tax],
                        marker_color=tax_colors[i % len(tax_colors)],
                    ))
                fig_darf.update_layout(
                    barmode="stack", height=280,
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    font_color="#fafafa",
                    legend=dict(orientation="h", y=-0.3),
                    margin=dict(l=0, r=0, t=20, b=0),
                    yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
                )
                st.plotly_chart(fig_darf, use_container_width=True)

    st.divider()

    # Faturamento vs DARF lag chart
    st.subheader("Faturamento vs. DARF a Pagar (defasagem de 1 mês)")
    if not fat.empty and not darf.empty and "Total" in fat.columns and "DARF a Pagar" in darf.columns:
        fig_lag = go.Figure()
        fig_lag.add_trace(go.Scatter(
            x=fat["Mês"], y=fat["Total"],
            mode="lines+markers", name="Faturamento Bruto",
            line=dict(color=COLORS["receita"], width=2),
            marker=dict(size=7),
        ))
        darf_num = pd.to_numeric(darf["DARF a Pagar"], errors="coerce").fillna(0)
        # Shift DARF by 1 month (pays in following month)
        darf_shifted = [None] + list(darf_num.iloc[:-1])
        fig_lag.add_trace(go.Scatter(
            x=fat["Mês"], y=darf_shifted,
            mode="lines+markers", name="DARF a Pagar (mês seguinte)",
            line=dict(color=COLORS["darf"], width=2, dash="dash"),
            marker=dict(size=7),
        ))
        fig_lag.update_layout(
            height=280,
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            legend=dict(orientation="h", y=-0.3),
            margin=dict(l=0, r=0, t=20, b=0),
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
        )
        st.plotly_chart(fig_lag, use_container_width=True)

    # Parcelamentos PJ
    st.divider()
    st.subheader("Parcelamentos PJ (dívidas tributárias)")
    pj = data.pj_parcelas_config
    if not pj.empty:
        disp = pj.copy()
        for c in ["Parcela", "Total"]:
            if c in disp.columns:
                disp[c] = pd.to_numeric(disp[c], errors="coerce").fillna(0).apply(_fmt_brl)
        show = [c for c in ["Descrição", "Parcela", "N Parcelas", "Mês Final", "Total", "Status", "Obs"] if c in disp.columns]
        st.dataframe(disp[show], use_container_width=True, hide_index=True)
        total_comp = pd.to_numeric(pj["Total"], errors="coerce").fillna(0).sum()
        st.caption(f"Total compromissado: **{_fmt_brl(total_comp)}**")
