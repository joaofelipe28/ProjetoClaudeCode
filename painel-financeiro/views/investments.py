import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

from data.investments_editor import load_investments, save_investments, INV_HEADERS
from config import COLORS

INV_TIPOS = ["Tesouro Direto", "CDB", "LCI", "LCA", "Poupança", "Debênture", "FII", "Ação", "ETF", "Cripto", "Outros"]
INV_LIQUIDEZ = ["Diária", "No vencimento", "30 dias", "60 dias", "90 dias", "180 dias", "360 dias+"]


def _fmt_brl(v):
    try:
        return f"R$ {float(v):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except (ValueError, TypeError):
        return "–"


def _fmt_pct(v):
    try:
        return f"{float(v):.2f}%"
    except (ValueError, TypeError):
        return "–"


def _project_fixed_income(saldo_atual: float, aporte_mensal: float, taxa_anual: float, anos: int) -> list:
    taxa_mensal = (1 + taxa_anual / 100) ** (1 / 12) - 1
    valores, aportes = [], []
    saldo = saldo_atual
    acumulado_aporte = saldo_atual
    for _ in range(anos * 12):
        saldo = saldo * (1 + taxa_mensal) + aporte_mensal
        acumulado_aporte += aporte_mensal
        valores.append(saldo)
        aportes.append(acumulado_aporte)
    return valores, aportes


def render():
    st.header("📈 Investimentos")
    st.caption("Acompanhe sua carteira de renda fixa e simule projeções de longo prazo.")

    xlsx_path = st.session_state.get("xlsx_path_current", "")
    if not xlsx_path:
        st.error("Caminho do xlsx não encontrado. Verifique o sidebar.")
        return

    df = load_investments(xlsx_path)

    for col in ["Nome", "Tipo", "Instituição", "Vencimento", "Liquidez", "Obs"]:
        if col not in df.columns:
            df[col] = ""
        else:
            df[col] = df[col].fillna("").astype(str)
    for col in ["Valor Aplicado", "Saldo Atual", "Taxa a.a. (%)"]:
        if col not in df.columns:
            df[col] = 0.0
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    has_data = not df.empty and df["Nome"].str.strip().ne("").any()

    # ── KPIs ─────────────────────────────────────────────────────────────────
    if has_data:
        total_aplicado = df["Valor Aplicado"].sum()
        saldo_atual = df["Saldo Atual"].sum()
        ganho = saldo_atual - total_aplicado
        rentabilidade = (ganho / total_aplicado * 100) if total_aplicado > 0 else 0.0

        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Total Aplicado", _fmt_brl(total_aplicado))
        c2.metric("Saldo Atual", _fmt_brl(saldo_atual))
        c3.metric("Ganho Total", _fmt_brl(ganho), delta=f"{rentabilidade:+.2f}%")
        taxa_media = (df["Taxa a.a. (%)"] * df["Saldo Atual"]).sum() / saldo_atual if saldo_atual > 0 else 0
        c4.metric("Taxa Média Ponderada", _fmt_pct(taxa_media) + " a.a.")

        st.divider()

        col_table, col_charts = st.columns([3, 2])

        with col_charts:
            # Allocation donut by type
            tipo_df = df[df["Saldo Atual"] > 0].copy()
            if not tipo_df.empty:
                tipo_sum = tipo_df.groupby("Tipo")["Saldo Atual"].sum().reset_index()
                fig_donut = go.Figure(go.Pie(
                    labels=tipo_sum["Tipo"],
                    values=tipo_sum["Saldo Atual"],
                    hole=0.52,
                    textinfo="label+percent",
                    textfont_size=11,
                ))
                fig_donut.update_layout(
                    title="Alocação por Tipo",
                    height=280, showlegend=False,
                    paper_bgcolor="rgba(0,0,0,0)", font_color="#fafafa",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_donut, use_container_width=True)

            # Gain per position
            df_gain = df[df["Nome"].str.strip() != ""].copy()
            df_gain["Ganho"] = df_gain["Saldo Atual"] - df_gain["Valor Aplicado"]
            df_gain["Retorno %"] = (df_gain["Ganho"] / df_gain["Valor Aplicado"].replace(0, float("nan")) * 100).fillna(0)
            if not df_gain.empty:
                fig_ret = px.bar(
                    df_gain.sort_values("Retorno %"),
                    x="Retorno %", y="Nome", orientation="h",
                    color="Retorno %",
                    color_continuous_scale=["#e74c3c", "#f1c40f", "#2ecc71"],
                    text=df_gain.sort_values("Retorno %")["Retorno %"].apply(lambda v: f"{v:.1f}%"),
                    labels={"Retorno %": "Retorno (%)", "Nome": ""},
                )
                fig_ret.update_traces(textposition="outside")
                fig_ret.update_layout(
                    title="Retorno por Posição",
                    height=max(200, len(df_gain) * 36),
                    paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
                    font_color="#fafafa", showlegend=False,
                    coloraxis_showscale=False,
                    margin=dict(l=0, r=60, t=40, b=0),
                )
                st.plotly_chart(fig_ret, use_container_width=True)

    else:
        st.info("Nenhuma posição cadastrada ainda. Adicione seus investimentos na tabela abaixo.")

    # ── Positions table ───────────────────────────────────────────────────────
    st.subheader("Posições")

    edited = st.data_editor(
        df[INV_HEADERS] if has_data else pd.DataFrame(columns=INV_HEADERS),
        use_container_width=True,
        hide_index=True,
        num_rows="dynamic",
        column_config={
            "Nome": st.column_config.TextColumn("Nome", width="medium"),
            "Tipo": st.column_config.SelectboxColumn("Tipo", options=INV_TIPOS),
            "Instituição": st.column_config.TextColumn("Instituição"),
            "Valor Aplicado": st.column_config.NumberColumn("Aplicado (R$)", format="R$ %.2f"),
            "Saldo Atual": st.column_config.NumberColumn("Saldo Atual (R$)", format="R$ %.2f"),
            "Taxa a.a. (%)": st.column_config.NumberColumn("Taxa a.a. (%)", format="%.2f%%"),
            "Vencimento": st.column_config.TextColumn("Vencimento"),
            "Liquidez": st.column_config.SelectboxColumn("Liquidez", options=INV_LIQUIDEZ),
            "Obs": st.column_config.TextColumn("Obs"),
        },
        key="inv_editor",
    )

    if st.button("💾 Salvar Posições", key="save_inv", type="primary"):
        try:
            save_investments(xlsx_path, edited)
            st.cache_data.clear()
            st.success("Posições salvas!")
            st.rerun()
        except Exception as e:
            st.error(f"Erro ao salvar: {e}")

    st.divider()

    # ── Projection simulator ──────────────────────────────────────────────────
    st.subheader("📊 Simulador de Projeção")
    st.caption("Projete o crescimento da carteira com aportes mensais e taxa de retorno definidos.")

    saldo_base = float(df["Saldo Atual"].sum()) if has_data else 0.0
    taxa_base = float((df["Taxa a.a. (%)"] * df["Saldo Atual"]).sum() / df["Saldo Atual"].sum()) if has_data and df["Saldo Atual"].sum() > 0 else 12.0

    sc1, sc2, sc3 = st.columns(3)
    with sc1:
        saldo_inicial = st.number_input("Saldo inicial (R$)", value=saldo_base, step=1000.0, format="%.2f", key="sim_saldo")
    with sc2:
        aporte = st.number_input("Aporte mensal (R$)", value=1000.0, step=100.0, format="%.2f", key="sim_aporte")
    with sc3:
        taxa = st.number_input("Taxa anual (%)", value=taxa_base, step=0.5, format="%.2f", key="sim_taxa")

    anos = st.slider("Período (anos)", min_value=1, max_value=30, value=10, key="sim_anos")

    valores, aportes_acum = _project_fixed_income(saldo_inicial, aporte, taxa, anos)

    valor_final = valores[-1] if valores else 0
    total_investido = aportes_acum[-1] if aportes_acum else 0
    rendimento = valor_final - total_investido

    r1, r2, r3 = st.columns(3)
    r1.metric("Valor Futuro", _fmt_brl(valor_final))
    r2.metric("Total Investido", _fmt_brl(total_investido))
    r3.metric("Rendimento Total", _fmt_brl(rendimento), delta=f"+{rendimento / total_investido * 100:.1f}%" if total_investido > 0 else None)

    # Projection chart
    import numpy as np
    meses = list(range(1, anos * 12 + 1))
    anos_labels = [f"Ano {m // 12}" if m % 12 == 0 else "" for m in meses]

    fig_proj = go.Figure()
    fig_proj.add_trace(go.Scatter(
        x=meses, y=valores,
        name="Saldo Projetado",
        line=dict(color=COLORS["saldo"], width=2),
        fill="tozeroy",
        fillcolor="rgba(26,188,156,0.12)",
    ))
    fig_proj.add_trace(go.Scatter(
        x=meses, y=aportes_acum,
        name="Total Investido",
        line=dict(color=COLORS["receita"], width=1.5, dash="dot"),
    ))
    fig_proj.update_layout(
        height=320,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font_color="#fafafa",
        margin=dict(l=0, r=0, t=10, b=0),
        legend=dict(orientation="h", y=1.1),
        xaxis=dict(
            title="Meses",
            gridcolor="rgba(255,255,255,0.07)",
            tickvals=[i * 12 for i in range(1, anos + 1)],
            ticktext=[f"Ano {i}" for i in range(1, anos + 1)],
        ),
        yaxis=dict(
            title="R$",
            gridcolor="rgba(255,255,255,0.07)",
            tickformat=",.0f",
        ),
    )
    st.plotly_chart(fig_proj, use_container_width=True)
