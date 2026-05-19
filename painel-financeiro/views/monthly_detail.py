import streamlit as st
import plotly.graph_objects as go
import pandas as pd

from config import COLORS, MONTHS, MONTH_LABELS
from data.editor import save_month_revenues, save_pontuais_mes
from data.reconciler import ALL_CATEGORIES


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

    xlsx_path = st.session_state.get("xlsx_path_current", "")

    st.header(f"Detalhes: {month.label}")

    rev_df = month.revenues
    total_receita = 0.0
    saldo_anterior = 0.0

    if not rev_df.empty and "Previsto" in rev_df.columns:
        rev_num = pd.to_numeric(rev_df["Previsto"], errors="coerce").fillna(0)
        rev_df = rev_df.copy()
        rev_df["Previsto"] = rev_num
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
        # ── Receitas — editable ───────────────────────────────────────────────
        st.subheader("Receitas")
        if not rev_df.empty:
            rev_edit = rev_df.iloc[1:].copy() if len(rev_df) > 1 else rev_df.copy()

            for col in ["Realizado", "Status"]:
                if col not in rev_edit.columns:
                    rev_edit[col] = "" if col == "Status" else 0.0

            rev_edit["Realizado"] = pd.to_numeric(rev_edit["Realizado"], errors="coerce").fillna(0.0)

            edited_rev = st.data_editor(
                rev_edit[["Descrição", "Previsto", "Realizado", "Status"]],
                use_container_width=True,
                hide_index=True,
                num_rows="fixed",
                column_config={
                    "Descrição": st.column_config.TextColumn("Descrição", disabled=True),
                    "Previsto": st.column_config.NumberColumn("Previsto (R$)", format="R$ %.2f", disabled=True),
                    "Realizado": st.column_config.NumberColumn("Realizado (R$)", format="R$ %.2f"),
                    "Status": st.column_config.SelectboxColumn(
                        "Status", options=["Pago", "Previsto", "Cancelado", "Pendente"]
                    ),
                },
                key=f"rev_editor_{selected_month_key}",
            )

            if xlsx_path and st.button("💾 Confirmar Receitas", key=f"save_rev_{selected_month_key}", type="primary"):
                try:
                    save_month_revenues(xlsx_path, selected_month_key, edited_rev)
                    st.cache_data.clear()
                    st.success("Receitas salvas!")
                    st.rerun()
                except Exception as e:
                    st.error(f"Erro ao salvar: {e}")

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

        # ── Pontuais — editable ───────────────────────────────────────────────
        st.subheader("Gastos Pontuais")

        pont_df = month.pontuais.copy() if not month.pontuais.empty else pd.DataFrame(
            columns=["Descrição", "Categoria", "Valor", "Status"]
        )
        for col in ["Descrição", "Categoria", "Status"]:
            if col not in pont_df.columns:
                pont_df[col] = ""
        if "Valor" not in pont_df.columns:
            pont_df["Valor"] = 0.0
        pont_df["Valor"] = pd.to_numeric(pont_df["Valor"], errors="coerce").fillna(0.0)

        edited_pont = st.data_editor(
            pont_df[["Descrição", "Categoria", "Valor", "Status"]],
            use_container_width=True,
            hide_index=True,
            num_rows="dynamic",
            column_config={
                "Valor": st.column_config.NumberColumn("Valor (R$)", format="R$ %.2f"),
                "Categoria": st.column_config.SelectboxColumn("Categoria", options=ALL_CATEGORIES),
                "Status": st.column_config.SelectboxColumn(
                    "Status", options=["Confirmado", "Previsto", "Cancelado", ""]
                ),
            },
            key=f"pont_editor_{selected_month_key}",
        )

        if xlsx_path and st.button("💾 Confirmar Pontuais", key=f"save_pont_{selected_month_key}", type="primary"):
            try:
                save_pontuais_mes(xlsx_path, selected_month_key, edited_pont)
                st.cache_data.clear()
                st.success("Gastos pontuais salvos!")
                st.rerun()
            except Exception as e:
                st.error(f"Erro ao salvar: {e}")

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
