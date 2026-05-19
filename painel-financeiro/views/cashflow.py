import streamlit as st
import plotly.graph_objects as go
import pandas as pd

from config import COLORS, MONTHS, MONTH_LABELS


def _fmt_brl(v):
    try:
        return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "–"


def render(data):
    st.header("Fluxo de Caixa 2026")

    df = data.monthly_summary
    if df.empty:
        st.warning("Dados de resumo mensal não encontrados.")
        return

    months_data = df[~df["Mês"].str.contains("TOTAL", case=False, na=True)].copy()
    for c in ["Saldo do Mês", "Saldo Acumulado", "Receitas", "Total Despesas"]:
        if c in months_data.columns:
            months_data[c] = pd.to_numeric(months_data[c], errors="coerce").fillna(0)

    # Annual waterfall
    st.subheader("Saldo Mensal — Visão Anual")
    labels_wf = list(months_data["Mês"]) if "Mês" in months_data.columns else MONTH_LABELS[:len(months_data)]
    saldos = months_data["Saldo do Mês"].tolist() if "Saldo do Mês" in months_data.columns else []

    if saldos:
        fig_wf = go.Figure(go.Waterfall(
            orientation="v",
            measure=["relative"] * len(saldos),
            x=labels_wf,
            y=saldos,
            connector=dict(line=dict(color="rgba(255,255,255,0.3)", width=1)),
            decreasing=dict(marker_color=COLORS["fixos"]),
            increasing=dict(marker_color=COLORS["receita"]),
            text=[_fmt_brl(v) for v in saldos],
            textposition="outside",
            textfont=dict(size=10),
        ))
        # Overlay accumulated balance line
        if "Saldo Acumulado" in months_data.columns:
            fig_wf.add_trace(go.Scatter(
                x=labels_wf, y=months_data["Saldo Acumulado"].tolist(),
                mode="lines+markers",
                line=dict(color=COLORS["saldo"], width=2, dash="dot"),
                marker=dict(size=6),
                name="Saldo Acumulado",
                yaxis="y2",
            ))
            fig_wf.update_layout(
                yaxis2=dict(overlaying="y", side="right", showgrid=False,
                            tickformat=",.0f", tickprefix="R$"),
            )

        reserva_alvo = data.kpis.get("reserva_alvo", 24858.9)
        fig_wf.add_hline(
            y=0, line_color="rgba(255,255,255,0.3)", line_width=1,
        )
        fig_wf.update_layout(
            height=380,
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            margin=dict(l=0, r=60, t=20, b=0),
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
            legend=dict(orientation="h", y=-0.2),
            barmode="relative",
        )
        st.plotly_chart(fig_wf, use_container_width=True)

    st.divider()

    # Accumulated balance with targets
    st.subheader("Saldo Acumulado e Metas")
    if "Saldo Acumulado" in months_data.columns:
        reserva_alvo = data.kpis.get("reserva_alvo", 24858.9)
        break_even = data.kpis.get("break_even", 0)

        fig_acc = go.Figure()
        fig_acc.add_trace(go.Scatter(
            x=labels_wf, y=months_data["Saldo Acumulado"].tolist(),
            mode="lines+markers+text",
            fill="tozeroy",
            fillcolor="rgba(30,111,80,0.2)",
            line=dict(color=COLORS["saldo"], width=3),
            marker=dict(size=8),
            text=[_fmt_brl(v) for v in months_data["Saldo Acumulado"]],
            textposition="top center",
            textfont=dict(size=9),
            name="Saldo Acumulado",
        ))
        fig_acc.add_hline(
            y=reserva_alvo, line_dash="dash", line_color=COLORS["alerta"],
            annotation_text=f"Reserva de Emergência ({_fmt_brl(reserva_alvo)})",
            annotation_position="bottom right",
        )
        fig_acc.add_hline(
            y=break_even, line_dash="dot", line_color="#95a5a6",
            annotation_text=f"Break-even ({_fmt_brl(break_even)})",
            annotation_position="top right",
        )
        fig_acc.update_layout(
            height=320,
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
            margin=dict(l=0, r=0, t=20, b=0),
            showlegend=False,
        )
        st.plotly_chart(fig_acc, use_container_width=True)

    st.divider()

    # Debt paydown tracker
    st.subheader("Amortização das Dívidas PJ")
    pj = data.pj_parcelas_config
    if not pj.empty and "Parcela" in pj.columns and "N Parcelas" in pj.columns:
        pj = pj.copy()
        pj["Parcela"] = pd.to_numeric(pj["Parcela"], errors="coerce").fillna(0)
        pj["N Parcelas"] = pd.to_numeric(pj["N Parcelas"], errors="coerce").fillna(0)
        pj["Total"] = pd.to_numeric(pj["Total"], errors="coerce").fillna(0)

        # Build cumulative debt remaining per month
        debt_data = {}
        n_months = len(MONTHS)
        for _, row in pj.iterrows():
            desc = row["Descrição"]
            parcela = row["Parcela"]
            n_total = int(row["N Parcelas"])
            mes_ini = int(row.get("Mês Início", 5)) - 5  # 0-indexed from Mai
            remaining = []
            total_debt = row["Total"]
            for i in range(n_months):
                months_paid = max(0, i - mes_ini)
                rem = max(0, total_debt - months_paid * parcela)
                remaining.append(rem)
            debt_data[desc] = remaining

        fig_debt = go.Figure()
        debt_colors = [COLORS["darf"], COLORS["pj_parcelas"], COLORS["pontuais"], COLORS["parcelas"]]
        for i, (desc, values) in enumerate(debt_data.items()):
            fig_debt.add_trace(go.Scatter(
                x=MONTH_LABELS[:n_months], y=values,
                mode="lines+markers",
                stackgroup="one",
                name=desc,
                line=dict(color=debt_colors[i % len(debt_colors)], width=2),
                fill="tonexty",
            ))
        fig_debt.update_layout(
            height=300,
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)", tickprefix="R$ "),
            legend=dict(orientation="h", y=-0.3),
            margin=dict(l=0, r=0, t=20, b=0),
        )
        st.plotly_chart(fig_debt, use_container_width=True)

    st.divider()

    # Reserva de emergência
    st.subheader("Reserva de Emergência")
    reserva_alvo = data.kpis.get("reserva_alvo", 24858.9)
    reserva_atual = 0.0  # Current value from investments sheet
    progresso = min(reserva_atual / reserva_alvo, 1.0) if reserva_alvo else 0.0

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Meta", _fmt_brl(reserva_alvo))
    with col2:
        st.metric("Atual", _fmt_brl(reserva_atual))
    with col3:
        st.metric("Falta", _fmt_brl(reserva_alvo - reserva_atual))

    st.progress(progresso)

    # Projection: how many months to reach target based on monthly surplus
    if "Saldo do Mês" in months_data.columns:
        avg_surplus = months_data["Saldo do Mês"].mean()
        if avg_surplus > 0 and reserva_alvo > reserva_atual:
            months_to_goal = (reserva_alvo - reserva_atual) / avg_surplus
            st.info(
                f"Com o excedente médio mensal de {_fmt_brl(avg_surplus)}, "
                f"a reserva será atingida em aproximadamente **{months_to_goal:.1f} meses** "
                f"(se direcionado integralmente)."
            )
        else:
            st.warning("Reserva ainda em construção. Priorize aportes mensais.")

    # Parcelas pessoais
    st.divider()
    st.subheader("Parcelas Pessoais")
    parc = data.parcelas_pessoais_config
    if not parc.empty:
        disp = parc.copy()
        for c in ["Parcela", "Total"]:
            if c in disp.columns:
                disp[c] = pd.to_numeric(disp[c], errors="coerce").fillna(0).apply(_fmt_brl)
        show = [c for c in ["Descrição", "Categoria", "Parcela", "N Parcelas", "Mês Final", "Total", "Obs"] if c in disp.columns]
        st.dataframe(disp[show], use_container_width=True, hide_index=True)
        total = pd.to_numeric(parc["Total"], errors="coerce").fillna(0).sum()
        st.caption(f"Total em amortização: **{_fmt_brl(total)}**")
