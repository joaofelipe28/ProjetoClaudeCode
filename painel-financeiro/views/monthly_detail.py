import streamlit as st
import plotly.graph_objects as go
import pandas as pd

from config import COLORS, MONTHS, MONTH_LABELS


def _fmt_brl(v):
    if v is None or (isinstance(v, float) and v == 0):
        return "R$ –"
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _status_color(s):
    s = str(s).lower()
    if s in ("pago", "paga"):
        return "color: #2ecc71"
    if "previsto" in s:
        return "color: #f1c40f"
    if "pendente" in s or "a pagar" in s:
        return "color: #e74c3c"
    return ""


def render(data, selected_month_key: str):
    month = data.months.get(selected_month_key)
    if not month:
        st.warning(f"Dados de {selected_month_key} não encontrados.")
        return

    st.header(f"Detalhes: {month.label}")

    # Derive summary values from parsed data
    rev_df = month.revenues
    total_receita = 0.0
    saldo_anterior = 0.0

    if not rev_df.empty and "Previsto" in rev_df.columns:
        rev_num = pd.to_numeric(rev_df["Previsto"], errors="coerce").fillna(0)
        rev_df["Previsto"] = rev_num
        # Saldo anterior is the first row
        saldo_anterior = float(rev_num.iloc[0]) if len(rev_num) > 0 else 0.0
        total_receita = float(rev_num.iloc[1:].sum())

    pj_parc_total = 0.0
    if not month.pj_parcelas.empty and "Valor" in month.pj_parcelas.columns:
        pj_parc_total = float(pd.to_numeric(month.pj_parcelas["Valor"], errors="coerce").fillna(0).sum())

    darf_total = 0.0
    if not month.darf.empty and "Valor" in month.darf.columns:
        darf_total = float(pd.to_numeric(month.darf["Valor"], errors="coerce").fillna(0).sum())

    fixos_total = 0.0
    if not month.fixos.empty and "Valor" in month.fixos.columns:
        fixos_total = float(pd.to_numeric(month.fixos["Valor"], errors="coerce").fillna(0).sum())

    parcelas_total = 0.0
    if not month.parcelas_pessoais.empty and "Valor" in month.parcelas_pessoais.columns:
        parcelas_total = float(pd.to_numeric(month.parcelas_pessoais["Valor"], errors="coerce").fillna(0).sum())

    pontuais_total = 0.0
    if not month.pontuais.empty and "Valor" in month.pontuais.columns:
        pontuais_total = float(pd.to_numeric(month.pontuais["Valor"], errors="coerce").fillna(0).sum())

    total_despesas = pj_parc_total + darf_total + fixos_total + parcelas_total + pontuais_total
    saldo_mes = total_receita - total_despesas
    pct_comprometido = total_despesas / total_receita if total_receita > 0 else 0

    # KPI cards
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Receita do Mês", _fmt_brl(total_receita))
    with col2:
        st.metric("Total Despesas", _fmt_brl(total_despesas))
    with col3:
        st.metric("Saldo do Mês", _fmt_brl(saldo_mes))
    with col4:
        color = "🔴" if pct_comprometido > 0.9 else "🟡" if pct_comprometido > 0.8 else "🟢"
        st.metric("% Comprometido", f"{color} {pct_comprometido:.1%}")

    st.divider()

    col_left, col_right = st.columns([3, 2])

    with col_left:
        # Receitas table
        st.subheader("Receitas")
        if not rev_df.empty:
            # Skip saldo anterior row for display in revenues table (row 0)
            rev_display = rev_df.iloc[1:].copy() if len(rev_df) > 1 else rev_df.copy()
            if "Previsto" in rev_display.columns:
                rev_display["Previsto"] = rev_display["Previsto"].apply(_fmt_brl)
            if "Realizado" in rev_display.columns:
                rev_display["Realizado"] = pd.to_numeric(rev_display["Realizado"], errors="coerce").fillna(0).apply(_fmt_brl)

            cols_show = [c for c in ["Descrição", "Tipo", "Previsto", "Realizado", "Status"] if c in rev_display.columns]
            styled = rev_display[cols_show].style.applymap(_status_color, subset=["Status"]) if "Status" in rev_display.columns else rev_display[cols_show].style
            st.dataframe(styled, use_container_width=True, hide_index=True)

        # Parcelas PJ
        if not month.pj_parcelas.empty:
            st.subheader("Parcelamentos PJ")
            pj_disp = month.pj_parcelas.copy()
            if "Valor" in pj_disp.columns:
                pj_disp["Valor"] = pd.to_numeric(pj_disp["Valor"], errors="coerce").fillna(0).apply(_fmt_brl)
            cols_show = [c for c in ["Descrição", "Parcela Atual", "Valor", "Status"] if c in pj_disp.columns]
            st.dataframe(pj_disp[cols_show], use_container_width=True, hide_index=True)

        # DARF
        if not month.darf.empty:
            st.subheader("DARF")
            darf_disp = month.darf.copy()
            if "Valor" in darf_disp.columns:
                darf_disp["Valor"] = pd.to_numeric(darf_disp["Valor"], errors="coerce").fillna(0).apply(_fmt_brl)
            cols_show = [c for c in ["Descrição", "Competência", "Vencimento", "Valor", "Status"] if c in darf_disp.columns]
            st.dataframe(darf_disp[cols_show], use_container_width=True, hide_index=True)

        # Pontuais
        if not month.pontuais.empty:
            st.subheader("Gastos Pontuais")
            pont_disp = month.pontuais.copy()
            if "Valor" in pont_disp.columns:
                pont_disp["Valor"] = pd.to_numeric(pont_disp["Valor"], errors="coerce").fillna(0).apply(_fmt_brl)
            cols_show = [c for c in ["Descrição", "Categoria", "Valor", "Status"] if c in pont_disp.columns]
            st.dataframe(pont_disp[cols_show], use_container_width=True, hide_index=True)

    with col_right:
        # Waterfall chart
        st.subheader("Fluxo do Mês")

        expense_items = []
        if pj_parc_total > 0:
            expense_items.append(("Parc. PJ", -pj_parc_total, COLORS["pj_parcelas"]))
        if darf_total > 0:
            expense_items.append(("DARF", -darf_total, COLORS["darf"]))
        if fixos_total > 0:
            expense_items.append(("Fixos", -fixos_total, COLORS["fixos"]))
        if parcelas_total > 0:
            expense_items.append(("Parcelas", -parcelas_total, COLORS["parcelas"]))
        if pontuais_total > 0:
            expense_items.append(("Pontuais", -pontuais_total, COLORS["pontuais"]))

        labels = ["Receita"] + [x[0] for x in expense_items] + ["Saldo Final"]
        measures = ["absolute"] + ["relative"] * len(expense_items) + ["total"]
        values = [total_receita] + [x[1] for x in expense_items] + [saldo_mes]
        colors_wf = (
            [COLORS["receita"]] +
            [x[2] for x in expense_items] +
            [COLORS["saldo"] if saldo_mes >= 0 else COLORS["fixos"]]
        )

        fig_wf = go.Figure(go.Waterfall(
            orientation="v",
            measure=measures,
            x=labels,
            y=values,
            connector=dict(line=dict(color="rgba(255,255,255,0.3)", width=1)),
            decreasing=dict(marker_color=COLORS["fixos"]),
            increasing=dict(marker_color=COLORS["receita"]),
            totals=dict(marker_color=COLORS["saldo"]),
            text=[_fmt_brl(abs(v)) for v in values],
            textposition="outside",
            textfont=dict(size=9),
        ))
        fig_wf.update_layout(
            height=420,
            paper_bgcolor="rgba(0,0,0,0)",
            plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa",
            margin=dict(l=0, r=0, t=20, b=0),
            yaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
            showlegend=False,
        )
        st.plotly_chart(fig_wf, use_container_width=True)

        # Fixos breakdown donut
        if not month.fixos.empty and "Categoria" in month.fixos.columns:
            st.subheader("Fixos por Categoria")
            fixos_cat = month.fixos.copy()
            fixos_cat["Valor"] = pd.to_numeric(fixos_cat["Valor"], errors="coerce").fillna(0)
            cat_totals = fixos_cat.groupby("Categoria")["Valor"].sum().reset_index()
            fig_fix_pie = go.Figure(go.Pie(
                labels=cat_totals["Categoria"],
                values=cat_totals["Valor"],
                hole=0.5,
                textinfo="label+percent",
                textfont_size=10,
            ))
            fig_fix_pie.update_layout(
                height=250, showlegend=False,
                paper_bgcolor="rgba(0,0,0,0)", font_color="#fafafa",
                margin=dict(l=0, r=0, t=10, b=0),
            )
            st.plotly_chart(fig_fix_pie, use_container_width=True)
