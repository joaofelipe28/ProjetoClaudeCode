#!/usr/bin/env python3
"""
GERADOR UNIVERSAL DE APOSTILAS SM24
====================================
Lê um arquivo JSON com a estrutura da apostila e produz o PDF no padrão SM24.

USO:
    python3 build_apostila.py <arquivo.json> [--outdir /mnt/user-data/outputs]
    python3 build_apostila.py --batch <pasta_com_jsons/> [--outdir ...]

O JSON elimina a necessidade de escrever código Python por apostila.
Veja SCHEMA abaixo para a estrutura completa.
"""
import sys
import os
import json
import argparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + "/sm24-apostila")
sys.path.insert(0, "/home/claude/sm24-apostila")

from lib import (make_doc, block, sp, ChapterBar, SectionTitle, InfoBox, HighlightBox,
                 RxBox, CheckList, TwoCols, ComparisonTable, FlowChart, QuestionBox, AnswerBox)
from reportlab.platypus import KeepTogether, PageBreak


# ════════════════════════════════════════════════════════════════════
# CONSTRUTORES DE COMPONENTES (mapeiam tipo JSON → flowable)
# ════════════════════════════════════════════════════════════════════

def build_flowchart(spec):
    """spec: {title, height?, nodes:[{id,x,y,w,h,text,color,font_size?}], arrows:[[from,to],...]}"""
    nodes = []
    for n in spec["nodes"]:
        node = {
            "id": n["id"], "x": n["x"], "y": n["y"],
            "w": n["w"], "h": n["h"], "text": n["text"],
            "color": n.get("color", "navy"),
        }
        if "font_size" in n:
            node["font_size"] = n["font_size"]
        nodes.append(node)
    arrows = [tuple(a) for a in spec.get("arrows", [])]
    return FlowChart(
        title=spec["title"],
        nodes=nodes,
        arrows=arrows,
        height=spec.get("height", 220),
    )


def build_infobox(spec):
    """spec: {titulo, items, accent?}"""
    return InfoBox(spec["titulo"], spec["items"], spec.get("accent", "teal"))


def build_highlightbox(spec):
    """spec: {titulo, items, accent?, bg?}"""
    return HighlightBox(spec["titulo"], spec["items"],
                        spec.get("accent", "red"), spec.get("bg", "red_light"))


def build_rxbox(spec):
    """spec: {titulo, items}"""
    return RxBox(spec["titulo"], spec["items"])


def build_checklist(spec):
    """spec: {titulo, items}"""
    return CheckList(spec["titulo"], spec["items"])


def build_comparison_table(spec):
    """spec: {headers, header_colors, rows:[[...],...], col_widths?}"""
    rows = [tuple(r) for r in spec["rows"]]
    return ComparisonTable(
        headers=spec["headers"],
        header_colors=spec["header_colors"],
        rows=rows,
        col_widths=spec.get("col_widths"),
    )


# Componentes que entram dentro de TwoCols
INLINE_BUILDERS = {
    "infobox": build_infobox,
    "highlightbox": build_highlightbox,
    "rxbox": build_rxbox,
    "checklist": build_checklist,
    "comparison_table": build_comparison_table,
}


def build_twocols(spec):
    """spec: {left:{tipo,...}, right:{tipo,...}}"""
    left = INLINE_BUILDERS[spec["left"]["tipo"]](spec["left"])
    right = INLINE_BUILDERS[spec["right"]["tipo"]](spec["right"])
    return TwoCols(left, right)


# ════════════════════════════════════════════════════════════════════
# MONTAGEM DA STORY
# ════════════════════════════════════════════════════════════════════

def add_secao(story, secao):
    """Adiciona uma seção à story. Cada seção tem um 'tipo' e opcionalmente
    um 'section_title' (título de seção com barra lateral) antes do conteúdo."""
    tipo = secao["tipo"]

    # Título de seção (barra lateral colorida), se houver
    title_flow = None
    if secao.get("section_title"):
        title_flow = SectionTitle(secao["section_title"], secao.get("section_color", "teal"))

    # Constrói o flowable de conteúdo
    if tipo == "flowchart":
        content = build_flowchart(secao)
    elif tipo == "infobox":
        content = build_infobox(secao)
    elif tipo == "highlightbox":
        content = build_highlightbox(secao)
    elif tipo == "rxbox":
        content = build_rxbox(secao)
    elif tipo == "checklist":
        content = build_checklist(secao)
    elif tipo == "comparison_table":
        content = build_comparison_table(secao)
    elif tipo == "twocols":
        content = build_twocols(secao)
    elif tipo == "spacer":
        story.append(sp(secao.get("mm", 2)))
        return
    else:
        raise ValueError(f"Tipo de seção desconhecido: {tipo}")

    # Usa KeepTogether para boxes que não devem quebrar entre páginas
    keep = secao.get("keep_together", tipo in ("highlightbox", "checklist", "comparison_table"))

    if title_flow is not None:
        story.extend(block(title_flow, content))
    else:
        if keep:
            story.append(KeepTogether(content))
        else:
            story.append(content)
        story.append(sp(2.5))


def build_apostila(data, outdir):
    """data: dict carregado do JSON. Gera o PDF e retorna o caminho."""
    slug = data["slug"]
    out_path = os.path.join(outdir, f"apostila_{slug}.pdf")

    doc, story = make_doc(
        output_path=out_path,
        title=f"SM24 — {data['titulo']}",
        chapter_subject=data.get("chapter_subject", data["titulo"]),
        series_tag=data["especialidade"],
    )

    # Barra de capítulo
    story.append(ChapterBar(data.get("chapter_bar", data["titulo"].upper())))
    story.append(sp(3))

    # Seções do corpo
    for secao in data["secoes"]:
        add_secao(story, secao)

    # Questões
    if data.get("questoes"):
        story.append(PageBreak())
        story.append(ChapterBar(data.get("questoes_titulo", "FIXAÇÃO — QUESTÕES DE RESIDÊNCIA")))
        story.append(sp(3))
        for i, q in enumerate(data["questoes"], 1):
            story.append(KeepTogether(QuestionBox(
                q.get("num", i),
                q.get("source", "Adaptada"),
                q["enunciado"],
                q["alternativas"],
            )))

    # Gabarito
    if data.get("gabarito"):
        story.append(PageBreak())
        story.append(ChapterBar(data.get("gabarito_titulo", "GABARITO COMENTADO")))
        story.append(sp(3))
        for i, g in enumerate(data["gabarito"], 1):
            story.append(KeepTogether(AnswerBox(
                g.get("num", i),
                g["resposta"],
                g["comentario"],
            )))

    doc.build(story)
    return out_path


# ════════════════════════════════════════════════════════════════════
# VALIDAÇÃO DO JSON (evita erros silenciosos)
# ════════════════════════════════════════════════════════════════════

def validate(data):
    erros = []
    for campo in ("slug", "titulo", "especialidade", "secoes"):
        if campo not in data:
            erros.append(f"Campo obrigatório ausente: '{campo}'")
    if "secoes" in data and not isinstance(data["secoes"], list):
        erros.append("'secoes' deve ser uma lista")
    # valida cada seção
    for i, s in enumerate(data.get("secoes", [])):
        if "tipo" not in s:
            erros.append(f"Seção #{i+1} sem 'tipo'")
            continue
        t = s["tipo"]
        if t == "comparison_table":
            ncols = len(s.get("headers", []))
            if len(s.get("header_colors", [])) != ncols:
                erros.append(f"Seção #{i+1} (tabela): header_colors != nº de headers")
            for ri, row in enumerate(s.get("rows", [])):
                if len(row) != ncols:
                    erros.append(f"Seção #{i+1} (tabela) linha {ri+1}: {len(row)} células vs {ncols} colunas")
            if s.get("col_widths") and abs(sum(s["col_widths"]) - 1.0) > 0.02:
                erros.append(f"Seção #{i+1} (tabela): col_widths soma {sum(s['col_widths'])}, deveria ~1.0")
        if t == "flowchart":
            node_ids = {n["id"] for n in s.get("nodes", [])}
            for a in s.get("arrows", []):
                if a[0] not in node_ids or a[1] not in node_ids:
                    erros.append(f"Seção #{i+1} (flowchart): seta {a} referencia node inexistente")
    # questões x gabarito
    nq = len(data.get("questoes", []))
    ng = len(data.get("gabarito", []))
    if nq != ng:
        erros.append(f"Nº de questões ({nq}) != nº de gabaritos ({ng})")
    return erros


# ════════════════════════════════════════════════════════════════════
# CLI
# ════════════════════════════════════════════════════════════════════

def main():
    ap = argparse.ArgumentParser(description="Gerador universal de apostilas SM24")
    ap.add_argument("input", help="Arquivo JSON ou pasta (com --batch)")
    ap.add_argument("--batch", action="store_true", help="Processa todos os .json da pasta")
    ap.add_argument("--outdir", default="/mnt/user-data/outputs", help="Pasta de saída dos PDFs")
    ap.add_argument("--validate-only", action="store_true", help="Apenas valida, não gera PDF")
    args = ap.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    if args.batch:
        files = sorted([os.path.join(args.input, f) for f in os.listdir(args.input)
                        if f.endswith(".json")])
    else:
        files = [args.input]

    ok, fail = 0, 0
    for f in files:
        try:
            with open(f, encoding="utf-8") as fh:
                data = json.load(fh)
            erros = validate(data)
            if erros:
                print(f"❌ {os.path.basename(f)}: VALIDAÇÃO FALHOU")
                for e in erros:
                    print(f"     - {e}")
                fail += 1
                continue
            if args.validate_only:
                print(f"✅ {os.path.basename(f)}: válido")
                ok += 1
                continue
            out = build_apostila(data, args.outdir)
            # conta páginas
            try:
                import pypdf
                npag = len(pypdf.PdfReader(out).pages)
            except Exception:
                npag = "?"
            print(f"✅ {os.path.basename(f)} → {os.path.basename(out)} ({npag} p)")
            ok += 1
        except Exception as e:
            print(f"❌ {os.path.basename(f)}: ERRO — {e}")
            fail += 1

    print(f"\n=== {ok} OK | {fail} falhas | {len(files)} total ===")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
