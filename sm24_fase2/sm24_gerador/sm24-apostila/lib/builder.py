"""
SM24 Apostila — Construtor do documento PDF.
Cuida de configuração de página, header, footer e marca d'água.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Spacer, KeepTogether
)

from .flowables import THEME


def make_doc(
    output_path,
    title="SM24 — Protocolo Clínico",
    chapter_subject="Protocolo Clínico",
    series_name="Série Protocolos Clínicos",
    series_tag="NEUROLOGIA",
    logo_path=None,
    theme=None,
    show_watermark=True,
    watermark_alpha=0.07,
    watermark_size=580,
):
    """Cria um BaseDocTemplate configurado com header, footer e watermark.

    Parâmetros:
        output_path: caminho onde salvar o PDF
        title: metadado do PDF
        chapter_subject: aparece no header (ex: "Cefaleia no Adulto")
        series_name: aparece no footer (ex: "Série Protocolos Clínicos")
        series_tag: pill colorida no header (ex: "NEUROLOGIA", "CARDIOLOGIA")
        logo_path: caminho para a imagem de logo (PNG com fundo transparente).
                   Se None, busca em assets/logo_sm24.png ao lado do skill.
        theme: dict de cores. Default usa THEME (paleta SM24 padrão).
        show_watermark: se True, desenha logo grande como watermark
        watermark_alpha: opacidade do watermark (0-1). Padrão 0.07.
        watermark_size: tamanho do watermark em pontos. Padrão 580.

    Retorna:
        (doc, story_list)
            doc: BaseDocTemplate pronto para receber .build()
            story_list: lista vazia onde você anexa os flowables
    """
    t = theme or THEME

    # Resolver logo path padrão
    if logo_path is None:
        skill_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logo_path = os.path.join(skill_dir, "assets", "logo_sm24.png")

    PAGE_W, PAGE_H = A4
    ML, MR, MT, MB = 20*mm, 20*mm, 24*mm, 18*mm
    CW = PAGE_W - ML - MR

    def draw_page(c, doc):
        c.saveState()
        w, h = PAGE_W, PAGE_H

        # Pill com series_tag
        c.setFillColor(t["teal"])
        c.roundRect(ML, h - 18, 76, 14, 7, fill=1, stroke=0)
        c.setFillColor(t["white"])
        c.setFont("Helvetica-Bold", 6.2)
        c.drawCentredString(ML + 38, h - 14, series_tag)

        # Subject à direita
        c.setFillColor(t["gray"])
        c.setFont("Helvetica", 6.5)
        c.drawRightString(w - MR, h - 13, f"{chapter_subject}  |  SM24")

        # Page number
        c.setFillColor(t["navy"])
        c.roundRect(w - MR + 4, h - 19, 16, 16, 3.5, fill=1, stroke=0)
        c.setFillColor(t["white"])
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(w - MR + 12, h - 14, str(doc.page))

        # Linha sob o header
        c.setStrokeColor(t["gray_line"])
        c.setLineWidth(0.4)
        c.line(ML, h - 22, w - MR + 20, h - 22)

        # Footer
        c.setFillColor(t["teal"])
        c.rect(0, 0, w, 2.5, fill=1, stroke=0)
        c.setFillColor(t["gray"])
        c.setFont("Helvetica", 5.8)
        c.drawString(ML, 5, f"SM24 — Suporte Médico 24h  |  sm24.com.br  |  {series_name}")

        c.restoreState()

    def draw_page_end(c, doc):
        if not show_watermark or not os.path.exists(logo_path):
            return
        c.saveState()
        w, h = PAGE_W, PAGE_H
        # Aspect ratio do logo SM24 padrão (4260x3725)
        logo_h = watermark_size * (3725 / 4260)
        c.setFillAlpha(watermark_alpha)
        c.drawImage(
            logo_path,
            w / 2 - watermark_size / 2,
            h / 2 - logo_h / 2 - 5,
            width=watermark_size, height=logo_h,
            mask='auto', preserveAspectRatio=True,
        )
        c.restoreState()

    doc = BaseDocTemplate(
        output_path, pagesize=A4,
        leftMargin=ML, rightMargin=MR,
        topMargin=MT, bottomMargin=MB,
        title=title,
        author="SM24 - Suporte Médico 24h",
    )

    frame = Frame(ML, MB, CW, PAGE_H - MT - MB - 4*mm, id='main')
    doc.addPageTemplates([
        PageTemplate(id='main', frames=frame, onPage=draw_page, onPageEnd=draw_page_end)
    ])

    story = []
    return doc, story


def block(title_flow, *content_flows, after=2.5):
    """Helper para agrupar título de seção + primeiro conteúdo no mesmo bloco
    (evita órfãos), seguido de spacer.

    Uso:
        story.extend(block(
            SectionTitle("ANAMNESE"),
            InfoBox("SOCRATES", [...], "teal")
        ))
    """
    grouped = [title_flow, Spacer(1, 1.5*mm), *content_flows]
    return [KeepTogether(grouped), Spacer(1, after*mm)]


def sp(mm_h):
    """Spacer em milímetros. Uso: story.append(sp(3))"""
    return Spacer(1, mm_h * mm)
