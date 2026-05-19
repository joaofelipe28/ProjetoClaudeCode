import streamlit as st
import pandas as pd
import plotly.express as px

from data.extrato_parser import parse_pdf, Transacao
from data.reconciler import run_all, summary_stats, ALL_CATEGORIES
from data.extrato_export import export_xlsx
from config import MONTHS, MONTH_LABELS, COLORS


def _fmt_brl(v):
    try:
        return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "–"


def _badge(match_tipo: str) -> str:
    badges = {
        "fixo": "🔵 Fixo",
        "receita": "🟢 Receita",
        "pontual_candidato": "🟡 Pontual?",
        "parcela": "🟣 Parcela",
    }
    return badges.get(match_tipo, "⚪ –")


def render(data, selected_month_key: str):
    st.header("📋 Extrato Bancário")
    st.caption("Faça upload dos PDFs do seu extrato/fatura para categorizar, reconciliar e exportar.")

    # ── Upload ───────────────────────────────────────────────────────────────
    uploaded_files = st.file_uploader(
        "Arraste os PDFs aqui (C6, Santander, Inter — múltiplos arquivos permitidos)",
        type=["pdf"],
        accept_multiple_files=True,
        key="extrato_upload",
    )

    if not uploaded_files:
        st.info("Nenhum extrato carregado ainda. Faça upload de um ou mais PDFs acima.")
        _show_instructions()
        return

    # ── Process uploaded PDFs ────────────────────────────────────────────────
    all_transactions: list[Transacao] = []
    banks_detected = set()
    errors = []

    for uf in uploaded_files:
        try:
            transactions = parse_pdf(uf.read())
            all_transactions.extend(transactions)
            for t in transactions:
                banks_detected.add(t.banco)
        except Exception as e:
            errors.append(f"**{uf.name}**: {e}")

    if errors:
        for err in errors:
            st.error(err)

    if not all_transactions:
        st.warning("Nenhuma transação encontrada nos PDFs. Verifique se os arquivos são extratos bancários válidos.")
        return

    # ── Month context + run reconciliation ───────────────────────────────────
    col_month, col_info = st.columns([2, 3])
    with col_month:
        month_labels_display = MONTH_LABELS
        sel_idx = st.selectbox(
            "Reconciliar com o mês:",
            options=range(len(MONTHS)),
            format_func=lambda i: MONTH_LABELS[i],
            index=MONTHS.index(selected_month_key) if selected_month_key in MONTHS else 0,
            key="extrato_month_sel",
        )
        reconcile_month = MONTHS[sel_idx]

    month_data = data.months.get(reconcile_month)
    revenues_df = month_data.revenues if month_data else pd.DataFrame()
    fixos_df = data.fixos

    all_transactions = run_all(all_transactions, fixos_df, revenues_df)
    stats = summary_stats(all_transactions)

    with col_info:
        bancos_str = " | ".join(sorted(banks_detected))
        st.success(
            f"**{len(all_transactions)} transações** carregadas  ·  "
            f"Banco(s): **{bancos_str}**  ·  "
            f"Período: {len(uploaded_files)} arquivo(s)"
        )

    st.divider()

    # ── Summary KPIs ─────────────────────────────────────────────────────────
    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Créditos", _fmt_brl(stats["total_creditos"]))
    c2.metric("Total Débitos", _fmt_brl(stats["total_debitos"]))
    c3.metric("Saldo Extrato", _fmt_brl(stats["saldo"]))
    c4.metric("Receitas Confirmadas", f"{stats['n_receitas_confirmadas']} itens")
    c5.metric("Pontuais Candidatos", f"{stats['n_pontuais_candidatos']} itens")

    st.divider()

    # ── Receitas Confirmadas ─────────────────────────────────────────────────
    receitas_confirmadas = [t for t in all_transactions if t.match_tipo == "receita"]
    if receitas_confirmadas:
        st.subheader(f"✅ Receitas Identificadas no Extrato ({len(receitas_confirmadas)})")

        # Build a reconciliation view against the plan
        rec_rows = []
        for t in receitas_confirmadas:
            previsto = 0.0
            if not revenues_df.empty and "Previsto" in revenues_df.columns:
                matches = revenues_df[revenues_df["Descrição"].str.lower().str.contains(
                    t.match_descricao.lower()[:15], na=False
                )]
                if not matches.empty:
                    try:
                        previsto = float(matches.iloc[0]["Previsto"])
                    except (ValueError, TypeError):
                        pass
            delta = abs(t.valor) - previsto
            rec_rows.append({
                "Data": t.data,
                "Planejado": t.match_descricao,
                "Previsto": _fmt_brl(previsto),
                "Realizado (extrato)": _fmt_brl(abs(t.valor)),
                "Diferença": _fmt_brl(delta) if delta != 0 else "✓ OK",
            })

        st.dataframe(pd.DataFrame(rec_rows), use_container_width=True, hide_index=True)

        # Store confirmed revenues in session state for export
        if "receitas_confirmadas" not in st.session_state:
            st.session_state["receitas_confirmadas"] = {}
        st.session_state["receitas_confirmadas"][reconcile_month] = [
            {"descricao": t.match_descricao, "realizado": abs(t.valor), "status": "Pago"}
            for t in receitas_confirmadas
        ]

    st.divider()

    # ── Pontual Candidates ───────────────────────────────────────────────────
    pontuais_cands = [t for t in all_transactions if t.match_tipo == "pontual_candidato"]
    if pontuais_cands:
        st.subheader(f"🟡 Gastos Não Planejados — Candidatos a Pontuais ({len(pontuais_cands)})")
        st.caption("Esses gastos não constam no plano. Selecione os que deseja incluir como pontuais no xlsx.")

        if "pontuais_selecionados" not in st.session_state:
            st.session_state["pontuais_selecionados"] = {}

        pont_rows = []
        for i, t in enumerate(pontuais_cands):
            pont_rows.append({
                "_idx": i,
                "Data": t.data,
                "Descrição": t.descricao,
                "Categoria": t.categoria or "Outros",
                "Valor": abs(t.valor),
                "Incluir": st.session_state["pontuais_selecionados"].get(f"{reconcile_month}_{i}", False),
            })

        pont_df = pd.DataFrame(pont_rows).drop(columns=["_idx"])
        edited = st.data_editor(
            pont_df,
            use_container_width=True,
            hide_index=True,
            column_config={
                "Valor": st.column_config.NumberColumn("Valor (R$)", format="R$ %.2f"),
                "Categoria": st.column_config.SelectboxColumn("Categoria", options=ALL_CATEGORIES),
                "Incluir": st.column_config.CheckboxColumn("Incluir no xlsx?"),
            },
            key=f"pontuais_editor_{reconcile_month}",
        )

        # Save selections
        for i, row in edited.iterrows():
            st.session_state["pontuais_selecionados"][f"{reconcile_month}_{i}"] = row.get("Incluir", False)

        selected_pontuais = edited[edited["Incluir"] == True]
        if len(selected_pontuais) > 0:
            st.info(f"{len(selected_pontuais)} gasto(s) selecionado(s) para incluir no xlsx.")

    st.divider()

    # ── Spending by Category Chart ────────────────────────────────────────────
    debito_cats = [t for t in all_transactions if t.tipo == "debito" and t.categoria]
    if debito_cats:
        st.subheader("Despesas por Categoria")
        cat_df = pd.DataFrame([{"Categoria": t.categoria, "Valor": abs(t.valor)} for t in debito_cats])
        cat_sum = cat_df.groupby("Categoria")["Valor"].sum().reset_index().sort_values("Valor", ascending=True)
        fig = px.bar(
            cat_sum, x="Valor", y="Categoria", orientation="h",
            color_discrete_sequence=[COLORS["pontuais"]],
            labels={"Valor": "R$", "Categoria": ""},
            text=cat_sum["Valor"].apply(_fmt_brl),
        )
        fig.update_traces(textposition="outside")
        fig.update_layout(
            height=max(250, len(cat_sum) * 32),
            paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            font_color="#fafafa", margin=dict(l=0, r=80, t=10, b=0),
            xaxis=dict(gridcolor="rgba(255,255,255,0.1)"),
        )
        st.plotly_chart(fig, use_container_width=True)

    st.divider()

    # ── All Transactions (editable) ──────────────────────────────────────────
    st.subheader("Todas as Transações")
    st.caption("Edite as categorias diretamente na tabela. As alterações são usadas na exportação.")

    all_df = pd.DataFrame([{
        "Data": t.data,
        "Descrição": t.descricao,
        "Tipo": "↑ Crédito" if t.tipo == "credito" else "↓ Débito",
        "Valor (R$)": abs(t.valor),
        "Categoria": t.categoria or "",
        "Match": _badge(t.match_tipo),
        "Referência": t.match_descricao or "–",
    } for t in all_transactions])

    edited_all = st.data_editor(
        all_df,
        use_container_width=True,
        hide_index=True,
        column_config={
            "Valor (R$)": st.column_config.NumberColumn("Valor (R$)", format="R$ %.2f"),
            "Categoria": st.column_config.SelectboxColumn("Categoria", options=ALL_CATEGORIES),
            "Data": st.column_config.TextColumn("Data", disabled=True),
            "Descrição": st.column_config.TextColumn("Descrição", disabled=True),
            "Tipo": st.column_config.TextColumn("Tipo", disabled=True),
            "Match": st.column_config.TextColumn("Match", disabled=True),
            "Referência": st.column_config.TextColumn("Referência", disabled=True),
        },
        key=f"all_transactions_editor_{reconcile_month}",
    )

    st.divider()

    # ── Export ────────────────────────────────────────────────────────────────
    st.subheader("⬇ Exportar xlsx Atualizado")
    st.caption("Gera uma cópia do seu arquivo com os campos 'Realizado' e pontuais preenchidos. O original não é alterado.")

    xlsx_path = st.session_state.get("xlsx_path_current", "")

    col_exp1, col_exp2 = st.columns([3, 1])
    with col_exp1:
        n_rev = len(st.session_state.get("receitas_confirmadas", {}).get(reconcile_month, []))
        # Count pontuais selected from the edited table
        if "pontuais_editor_" + reconcile_month in st.session_state:
            pont_data = edited.copy() if pontuais_cands else pd.DataFrame()
            n_pont = int((pont_data["Incluir"] == True).sum()) if not pont_data.empty and "Incluir" in pont_data.columns else 0
        else:
            n_pont = 0
        st.info(f"Pronto para exportar: **{n_rev} receita(s)** reconciliada(s) + **{n_pont} pontual(is)** selecionado(s)")

    with col_exp2:
        export_clicked = st.button("⬇ Gerar xlsx", use_container_width=True, type="primary")

    if export_clicked:
        revenues_updates = st.session_state.get("receitas_confirmadas", {}).get(reconcile_month, [])

        pontuais_to_add = []
        if pontuais_cands and "Incluir" in edited.columns:
            for _, row in edited[edited["Incluir"] == True].iterrows():
                pontuais_to_add.append({
                    "data": row.get("Data", ""),
                    "descricao": row.get("Descrição", ""),
                    "categoria": row.get("Categoria", ""),
                    "valor": row.get("Valor", 0),
                    "status": "Confirmado",
                })

        if not xlsx_path:
            st.error("Caminho do xlsx não encontrado. Verifique o sidebar.")
        else:
            try:
                xlsx_bytes = export_xlsx(
                    original_path=xlsx_path,
                    month_key=reconcile_month,
                    revenues_updates=revenues_updates,
                    pontuais_to_add=pontuais_to_add,
                )
                import datetime
                filename = f"Painel_Financeiro_{reconcile_month}_{datetime.date.today().strftime('%Y%m%d')}.xlsx"
                st.download_button(
                    label=f"📥 Baixar {filename}",
                    data=xlsx_bytes,
                    file_name=filename,
                    mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    use_container_width=True,
                )
                st.success("xlsx gerado com sucesso! Clique acima para baixar.")
            except Exception as e:
                st.error(f"Erro ao gerar xlsx: {e}")


def _show_instructions():
    with st.expander("ℹ️ Como usar esta aba"):
        st.markdown("""
**Passo a passo:**

1. **Baixe o extrato** em PDF do seu banco (C6, Santander, Inter)
   - C6: App → Extrato → Exportar PDF
   - Santander: Internet Banking → Extrato → Gerar PDF
   - Inter: App → Extrato → Compartilhar PDF

2. **Faça upload** do(s) PDF(s) acima (pode enviar vários de uma vez)

3. **Selecione o mês** para reconciliar com as receitas planejadas

4. **Revise** as categorias e selecione os gastos pontuais para incluir no plano

5. **Exporte** o xlsx atualizado (opcional) — ele ficará disponível para download

> O arquivo original **nunca é modificado**. O app só gera uma nova versão para download.
        """)
