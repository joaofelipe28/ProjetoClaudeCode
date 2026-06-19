"""
SM24 Apostila — Exemplo mínimo demonstrando todos os componentes.

Este é o template base. Para criar um novo material:
1. Copie este arquivo
2. Substitua o conteúdo pelas seções do seu tema
3. Rode: python exemplo_minimo.py

Veja references/visual_components.md para catálogo completo dos componentes
e references/content_template.md para a estrutura padrão de capítulo.
"""

import sys, os
# Permite rodar de dentro de examples/ ou do diretório da skill
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib import (
    make_doc, block, sp,
    ChapterBar, SectionTitle,
    InfoBox, HighlightBox, RxBox, CheckList,
    TwoCols,
    ComparisonTable,
    FlowChart,
    QuestionBox, AnswerBox,
    THEME,
)
from reportlab.platypus import KeepTogether, PageBreak

# ═══════════════════════════════════════════════════════════
# CONFIGURAÇÃO DO DOCUMENTO
# ═══════════════════════════════════════════════════════════

doc, story = make_doc(
    output_path="exemplo_apostila.pdf",
    title="SM24 — Exemplo de Apostila",
    chapter_subject="Tema do Capítulo",
    series_tag="NEUROLOGIA",  # ou CARDIOLOGIA, INFECTOLOGIA, etc.
)


# ═══════════════════════════════════════════════════════════
# CAPÍTULO
# ═══════════════════════════════════════════════════════════

story.append(ChapterBar("TÍTULO DO CAPÍTULO"))
story.append(sp(3))

# ── Seção 1: Fluxograma de visão geral ──
story.extend(block(
    SectionTitle("VISÃO GERAL — CONDUTA"),
    FlowChart(
        title="FLUXOGRAMA DE CONDUTA",
        height=200,
        nodes=[
            {"id": "start",   "x": 0.5, "y": 0.88, "w": 100, "h": 18, "text": "QUEIXA PRINCIPAL", "color": "navy"},
            {"id": "avalia",  "x": 0.5, "y": 0.65, "w": 150, "h": 18, "text": "ANAMNESE + EXAME", "color": "teal", "font_size": 7.5},
            {"id": "alarme",  "x": 0.25, "y": 0.4, "w": 110, "h": 22, "text": "RED FLAGS\nPositivo", "color": "red"},
            {"id": "ok",      "x": 0.75, "y": 0.4, "w": 110, "h": 22, "text": "RED FLAGS\nNegativo", "color": "green"},
            {"id": "investig", "x": 0.25, "y": 0.13, "w": 110, "h": 22, "text": "Investigar com\nexames", "color": "purple"},
            {"id": "trat",     "x": 0.75, "y": 0.13, "w": 110, "h": 22, "text": "Tratamento\ndirecionado", "color": "blue"},
        ],
        arrows=[
            ("start", "avalia"),
            ("avalia", "alarme"),
            ("avalia", "ok"),
            ("alarme", "investig"),
            ("ok", "trat"),
        ]
    )
))

# ── Seção 2: Anamnese (InfoBox) ──
story.extend(block(
    SectionTitle("ANAMNESE DIRECIONADA"),
    InfoBox(
        "PONTOS-CHAVE NA ANAMNESE", [
            "Item principal 1",
            "Item principal 2",
            "Item principal 3",
            "Item principal 4",
        ], "teal"
    )
))

# ── Seção 3: Perguntas-chave (HighlightBox) ──
story.append(KeepTogether(HighlightBox(
    "PERGUNTAS-CHAVE AO PACIENTE", [
        '"Pergunta direta 1?"',
        '"Pergunta direta 2?"',
        '"Pergunta direta 3?"',
    ], "purple", "purple_light"
)))
story.append(sp(3))

# ── Seção 4: Red Flags ──
story.extend(block(
    SectionTitle("SINAIS DE ALERTA — RED FLAGS", color="red"),
    HighlightBox(
        "EXIGEM INVESTIGAÇÃO IMEDIATA", [
            "Sinal de alarme 1",
            "Sinal de alarme 2",
            "Sinal de alarme 3",
        ], "red", "red_light"
    )
))

# ── Seção 5: Classificação em duas colunas ──
story.extend(block(
    SectionTitle("CLASSIFICAÇÃO"),
    TwoCols(
        InfoBox("TIPO A", ["Item 1", "Item 2"], "teal"),
        InfoBox("TIPO B", ["Item 1", "Item 2"], "red"),
    )
))

# ── Seção 6: Tabela comparativa ──
story.extend(block(
    SectionTitle("COMPARAÇÃO ENTRE TIPOS"),
    ComparisonTable(
        headers=["Característica", "Tipo A", "Tipo B", "Tipo C"],
        header_colors=["gray", "purple", "blue", "orange"],
        rows=[
            ("Característica 1", "Valor A", "Valor B", "Valor C"),
            ("Característica 2", "Valor A", "Valor B", "Valor C"),
            ("Característica 3", "Valor A", "Valor B", "Valor C"),
        ]
    )
))

# ── Seção 7: Tratamento (Two cols + Rx) ──
story.extend(block(
    SectionTitle("TRATAMENTO", color="purple"),
    TwoCols(
        HighlightBox("CARACTERÍSTICAS", [
            "Característica clínica 1",
            "Característica clínica 2",
        ], "purple", "purple_light"),
        HighlightBox("CONDUTA INICIAL", [
            "Medicação 1: dose e via",
            "Medicação 2: dose e via",
        ], "teal", "teal_bg"),
    ),
    after=2
))

story.append(KeepTogether(RxBox(
    "MODELO DE PRESCRIÇÃO", [
        "1. Medicação A — dose, via, frequência",
        "2. Medicação B — dose, via, frequência",
        "3. Medicação C (se refratário) — dose, via",
    ]
)))
story.append(sp(3))

# ── Seção 8: Checklist de alta ──
story.extend(block(
    SectionTitle("CHECKLIST DE ALTA", color="green"),
    CheckList(
        "VERIFICAR ANTES DE LIBERAR O PACIENTE", [
            "Critério 1 atendido",
            "Critério 2 atendido",
            "Critério 3 atendido",
            "Orientações entregues por escrito",
        ]
    )
))

# ═══════════════════════════════════════════════════════════
# QUESTÕES DE PROVA (página separada)
# ═══════════════════════════════════════════════════════════

story.append(PageBreak())
story.append(ChapterBar("FIXAÇÃO — QUESTÕES DE RESIDÊNCIA"))
story.append(sp(3))

story.append(KeepTogether(HighlightBox(
    "INSTRUÇÕES", [
        "Questões selecionadas dos principais concursos médicos",
        "Tente responder antes de consultar o gabarito",
    ], "teal", "teal_bg"
)))
story.append(sp(3))

story.append(KeepTogether(QuestionBox(
    1, "FONTE / Adaptada",
    "Enunciado da questão clínica aqui. Descreva o caso, sintomas, achados de exame e pergunte o diagnóstico ou conduta.",
    [
        "Alternativa A",
        "Alternativa B",
        "Alternativa C — possivelmente correta",
        "Alternativa D",
        "Alternativa E",
    ]
)))
story.append(sp(2))

# Adicione mais 3-5 questões aqui...

story.append(sp(3))
story.append(SectionTitle("GABARITO COMENTADO", color="green"))
story.append(sp(2))

story.append(KeepTogether(AnswerBox(
    1, "C — Resposta correta resumida",
    "Comentário explicando o raciocínio: por que C é correta, por que as outras estão erradas, e o conceito-chave que a questão testa."
)))


# ═══════════════════════════════════════════════════════════
# BUILD
# ═══════════════════════════════════════════════════════════
doc.build(story)
print(f"PDF gerado: {os.path.abspath('exemplo_apostila.pdf')}")
