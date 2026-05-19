import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

from data.investments_editor import (
    load_investments, save_investments, INV_HEADERS,
    load_inv_historico, save_inv_historico, INV_HIST_HEADERS,
)
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


def _project_fixed_income(saldo_atual: float, aporte_mensal: float, taxa_anual: float, anos: int):
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
    hist_df = load_inv_historico(xlsx_path)

    # Normalize positions df
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

    has_pos = not df.empty and df["Nome"].str.strip().ne("").any()

    # Normalize history df
    for col in ["Mês", "Obs"]:
        if col not in hist_df.columns:
            hist_df[col] = ""
        else:
            hist_df[col] = hist_df[col].fillna("").astype(str)
    for col in ["Aporte (R$)", "Saldo Final (R$)", "Rentabilidade (%)"]:
        if col not in hist_df.columns:
            hist_df[col] = 0.0
        else:
            hist_df[col] = pd.to_numeric(hist_df[col], errors="coerce").fillna(0.0)

    has_hist = not hist_df.empty and hist_df["Mês"].str.strip().ne("").any()

    # ── KPIs ─────────────────────────────────────────────────────────────────
    saldo_carteira = float(df["Saldo Atual"].sum()) if has_pos else 0.0
    total_aplicado = float(df["Valor Aplicado"].sum()) if has_pos else 0.0

    # Use last history entry for saldo if available
    if has_hist:
        ultimo_saldo = float(hist_df["Saldo Final (R$)"].iloc[-1])
        total_aportado = float(hist_df["Aporte (R$)"].sum())
        rendimento_hist = ultimo_saldo - total_aportado
        rent_pct = (rendimento_hist / total_aportado * 100) if total_aportado > 0 else 0.0
    else:
        ultimo_saldo = saldo_carteira
        total_aportado = total_aplicado
        rendimento_hist = saldo_carteira - total_aplicado
        rent_pct = ((rendimento_hist / total_aplicado * 100) if total_aplicado > 0 else 0.0)

    taxa_media = (
        (df["Taxa a.a. (%)"] * df["Saldo Atual"]).sum() / saldo_carteira
        if has_pos and saldo_carteira > 0 else 0.0
    )

    c1, c2, c3, c4, c5 = st.columns(5)
    c1.metric("Total Aportado", _fmt_brl(total_aportado))
    c2.metric("Patrimônio Atual", _fmt_brl(ultimo_saldo))
    c3.metric("Rendimento Total", _fmt_brl(rendimento_hist), delta=f"{rent_pct:+.2f}%")
    c4.metric("Taxa Média", _fmt_pct(taxa_media) + " a.a.")
    if has_hist and len(hist_df) >= 2:
        rent_mes = float(hist_df["Rentabilidade (%)"].iloc[-1])
        c5.metric("Rent. Último Mês", _fmt_pct(rent_mes))
    else:
        c5.metric("Entradas", f"{len(hist_df)} meses")

    st.divider()

    # ── Historical growth chart ───────────────────────────────────────────────
    if has_hist:
        st.subheader("📊 Crescimento da Carteira")

        # Compute cumulative contributions
        hist_plot = hist_df[hist_df["Mês"].str.strip() != ""].copy()
        hist_plot["Aportes Acumulados"] = hist_plot["Aporte (R$)"].cumsum()
        hist_plot["Rendimento Acumulado"] = hist_plot["Saldo Final (R$)"] - hist_plot["Aportes Acumulados"]

        col_chart, col_table = st.columns([3, 2])

        with col_chart:
            fig = go.Figure()

            # Stacked bars: cumulative contributions + yield on top
            fig.add_trace(go.Bar(
                name="Aportes Acumulados",
                x=hist_plot["Mês"],
                y=hist_plot["Aportes Acumulados"],
                marker_color=COLORS["receita"],
                opacity=0.85,
            ))
            fig.add_trace(go.Bar(
                name="Rendimento Acumulado",
                x=hist_plot["Mês"],
                y=hist_plot["Rendimento Acumulado"].clip(lower=0),
                marker_color=COLORS["saldo"],
                opacity=0.9,
            ))
            # Line: total balance
            fig.add_trace(go.Scatter(
                name="Saldo Total",
                x=hist_plot["Mês"],
                y=hist_plot["Saldo Final (R$)"],
                mode="lines+markers",
                line=dict(color="#fafafa", width=2),
                marker=dict(size=6),
                yaxis="y",
            ))

            fig.update_layout(
                barmode="stack",
                height=360,
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font_color="#fafafa",
                margin=dict(l=0, r=0, t=10, b=0),
                legend=dict(orientation="h", y=1.12),
                xaxis=dict(gridcolor="rgba(255,255,255,0.07)"),
                yaxis=dict(
                    gridcolor="rgba(255,255,255,0.07)",
                    tickformat=",.0f",
                    tickprefix="R$ ",
                ),
            )
            st.plotly_chart(fig, use_container_width=True)

        with col_table:
            # Monthly return rate chart
            fig_rent = go.Figure(go.Bar(
                x=hist_plot["Mês"],
                y=hist_plot["Rentabilidade (%)"],
                marker_color=[
                    COLORS["saldo"] if v >= 0 else COLORS["fixos"]
                    for v in hist_plot["Rentabilidade (%)"]
                ],
                text=hist_plot["Rentabilidade (%)"].apply(lambda v: f"{v:.2f}%"),
                textposition="outside",
                textfont=dict(size=10),
            ))
            fig_rent.update_layout(
                title="Rentabilidade Mensal (%)",
                height=200,
                paper_bgcolor="rgba(0,0,0,0)",
                plot_bgcolor="rgba(0,0,0,0)",
                font_color="#fafafa",
                margin=dict(l=0, r=0, t=40, b=0),
                yaxis=dict(gridcolor="rgba(255,255,255,0.07)", ticksuffix="%"),
                showlegend=False,
            )
            st.plotly_chart(fig_rent, use_container_width=True)

            # Summary table
            summary = hist_plot[["Mês", "Aporte (R$)", "Saldo Final (R$)", "Rentabilidade (%)"]].copy()
            summary["Aporte (R$)"] = summary["Aporte (R$)"].apply(_fmt_brl)
            summary["Saldo Final (R$)"] = summary["Saldo Final (R$)"].apply(_fmt_brl)
            summary["Rentabilidade (%)"] = summary["Rentabilidade (%)"].apply(_fmt_pct)
            st.dataframe(summary, use_container_width=True, hide_index=True)

        st.divider()

    # ── Monthly history editor ────────────────────────────────────────────────
    st.subheader("📅 Histórico de Aportes Mensais")
    st.caption("Registre quanto aportou e o saldo ao final de cada mês. O gráfico acima atualiza automaticamente.")

    edited_hist = st.data_editor(
        hist_df[INV_HIST_HEADERS],
        use_container_width=True,
        hide_index=True,
        num_rows="dynamic",
        column_config={
            "Mês": st.column_config.TextColumn("Mês (ex: Mai/26)", width="small"),
            "Aporte (R$)": st.column_config.NumberColumn("Aporte (R$)", format="R$ %.2f"),
            "Saldo Final (R$)": st.column_config.NumberColumn("Saldo Final (R$)", format="R$ %.2f"),
            "Rentabilidade (%)": st.column_config.NumberColumn("Rentabilidade (%)", format="%.2f%%",
                help="% de rendimento sobre o saldo no mês (ex: CDI do mês)"),
            "Obs": st.column_config.TextColumn("Obs"),
        },
        key="inv_hist_editor",
    )

    if st.button("💾 Salvar Histórico", key="save_inv_hist", type="primary"):
        try:
            save_inv_historico(xlsx_path, edited_hist)
            st.cache_data.clear()
            st.success("Histórico salvo!")
            st.rerun()
        except Exception as e:
            st.error(f"Erro ao salvar: {e}")

    st.divider()

    # ── Positions table ───────────────────────────────────────────────────────
    with st.expander("📋 Posições da Carteira", expanded=not has_hist):
        st.caption("Cadastre seus ativos de renda fixa. Esses dados alimentam os KPIs acima.")

        edited = st.data_editor(
            df[INV_HEADERS] if has_pos else pd.DataFrame(columns=INV_HEADERS),
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

        # Allocation donut — only if positions exist
        if has_pos:
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
                    height=260, showlegend=False,
                    paper_bgcolor="rgba(0,0,0,0)", font_color="#fafafa",
                    margin=dict(l=0, r=0, t=40, b=0),
                )
                st.plotly_chart(fig_donut, use_container_width=True)

    st.divider()

    # ── Projection simulator ──────────────────────────────────────────────────
    st.subheader("🔭 Simulador de Projeção")
    st.caption("Projete o crescimento da carteira com aportes mensais e taxa de retorno definidos.")

    saldo_base = ultimo_saldo if (has_pos or has_hist) else 0.0
    taxa_base = taxa_media if taxa_media > 0 else 12.0

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
    r3.metric("Rendimento Total", _fmt_brl(rendimento),
              delta=f"+{rendimento / total_investido * 100:.1f}%" if total_investido > 0 else None)

    meses = list(range(1, anos * 12 + 1))
    fig_proj = go.Figure()
    fig_proj.add_trace(go.Scatter(
        x=meses, y=valores, name="Saldo Projetado",
        line=dict(color=COLORS["saldo"], width=2),
        fill="tozeroy", fillcolor="rgba(26,188,156,0.12)",
    ))
    fig_proj.add_trace(go.Scatter(
        x=meses, y=aportes_acum, name="Total Investido",
        line=dict(color=COLORS["receita"], width=1.5, dash="dot"),
    ))
    fig_proj.update_layout(
        height=320,
        paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
        font_color="#fafafa", margin=dict(l=0, r=0, t=10, b=0),
        legend=dict(orientation="h", y=1.1),
        xaxis=dict(
            gridcolor="rgba(255,255,255,0.07)",
            tickvals=[i * 12 for i in range(1, anos + 1)],
            ticktext=[f"Ano {i}" for i in range(1, anos + 1)],
        ),
        yaxis=dict(gridcolor="rgba(255,255,255,0.07)", tickformat=",.0f", tickprefix="R$ "),
    )
    st.plotly_chart(fig_proj, use_container_width=True)
