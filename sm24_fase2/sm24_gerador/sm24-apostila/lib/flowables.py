"""
SM24 Apostila — Biblioteca de componentes visuais
Versão: 1.0

Todos os flowables (componentes visuais) usados nas apostilas SM24.
Importe daqui ao construir um novo material.
"""

import math
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import mm
from reportlab.platypus import Spacer, KeepTogether
from reportlab.platypus.flowables import Flowable

# ═══════════════════════════════════════════════════════════
# PALETA SM24 PADRÃO
# ═══════════════════════════════════════════════════════════
# Importe THEME e modifique se quiser customizar para outro projeto.

THEME = {
    "navy":         HexColor("#0D2B4E"),  # Cor principal (header)
    "blue":         HexColor("#1A5276"),
    "teal":         HexColor("#2E86C1"),  # Accent principal
    "teal_light":   HexColor("#D4E6F1"),
    "teal_bg":      HexColor("#EBF5FB"),
    "red":          HexColor("#C0392B"),  # Red flags / alertas
    "red_light":    HexColor("#FADBD8"),
    "green":        HexColor("#1E8449"),  # Checklist / OK
    "green_light":  HexColor("#D5F5E3"),
    "orange":       HexColor("#D35400"),  # Atenção / SAMU
    "orange_light": HexColor("#FDEBD0"),
    "purple":       HexColor("#7D3C98"),  # Diagnósticos
    "purple_light": HexColor("#E8DAEF"),
    "gray":         HexColor("#5D6D7E"),
    "gray_light":   HexColor("#F2F4F4"),
    "gray_line":    HexColor("#D5D8DC"),
    "dark":         HexColor("#2C3E50"),  # Texto principal
    "white":        white,
}


def wrap_text(c, text, font, size, max_w):
    """Quebra texto em linhas que cabem em max_w. Retorna lista de strings."""
    words = text.split()
    lines, cur = [], ""
    for w in words:
        t = f"{cur} {w}".strip()
        if c.stringWidth(t, font, size) <= max_w:
            cur = t
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines or [""]


# ═══════════════════════════════════════════════════════════
# TÍTULOS / SEÇÕES
# ═══════════════════════════════════════════════════════════

class ChapterBar(Flowable):
    """Barra de título de capítulo no topo da página.
    Uso: ChapterBar("CEFALEIA NO ADULTO")
    """
    def __init__(self, title, theme=None):
        Flowable.__init__(self)
        self.title = title
        self.t = theme or THEME

    def wrap(self, aw, ah):
        self.w = aw
        return (aw, 34)

    def draw(self):
        c = self.canv
        w = self.w
        c.setFillColor(self.t["navy"])
        c.roundRect(0, 0, w, 32, 4, fill=1, stroke=0)
        c.setFillColor(self.t["teal"])
        c.rect(0, 30, w, 2, fill=1, stroke=0)
        c.setFillColor(self.t["white"])
        c.setFont("Helvetica-Bold", 14)
        c.drawString(14, 11, self.title)


class SectionTitle(Flowable):
    """Título de seção com barra lateral colorida.
    Uso: SectionTitle("ANAMNESE", color="teal")  # ou color=THEME["red"]
    """
    def __init__(self, text, color="teal", theme=None):
        Flowable.__init__(self)
        self.text = text
        self.t = theme or THEME
        # color pode ser string (key do theme) ou HexColor direto
        self.color = self.t[color] if isinstance(color, str) else color

    def wrap(self, aw, ah):
        self.w = aw
        return (aw, 18)

    def draw(self):
        c = self.canv
        c.setFillColor(self.color)
        c.roundRect(0, 0, 3, 16, 1.5, fill=1, stroke=0)
        c.setStrokeColor(self.t["gray_line"])
        c.setLineWidth(0.4)
        c.line(0, 0, self.w, 0)
        c.setFillColor(self.t["dark"])
        c.setFont("Helvetica-Bold", 10.5)
        c.drawString(10, 4, self.text)


# ═══════════════════════════════════════════════════════════
# CAIXAS DE CONTEÚDO
# ═══════════════════════════════════════════════════════════

class InfoBox(Flowable):
    """Caixa branca com header colorido e bullets. Visual mais "tabela".
    Uso: InfoBox("MNEMÔNICO SOCRATES", ["Item 1", "Item 2"], "teal")
    """
    def __init__(self, title, items, accent="teal", width=None, theme=None):
        Flowable.__init__(self)
        self.title = title
        self.items = items
        self.t = theme or THEME
        self.accent = self.t[accent] if isinstance(accent, str) else accent
        self.bw = width
        self._h = 0

    def wrap(self, aw, ah):
        self.bw = min(self.bw or aw, aw)
        lh = 12
        total = sum(max(1, int(len(it) * 4.8 / (self.bw - 28)) + 1) for it in self.items)
        self._h = max(36, 24 + total * lh + 8)
        return (self.bw, self._h)

    def draw(self):
        c = self.canv
        w, h = self.bw, self._h
        c.setStrokeColor(self.t["gray_line"])
        c.setLineWidth(0.6)
        c.setFillColor(self.t["white"])
        c.roundRect(0, 0, w, h, 3.5, fill=1, stroke=1)
        c.setFillColor(self.accent)
        c.roundRect(0, h - 20, w, 20, 3.5, fill=1, stroke=0)
        c.rect(0, h - 20, w, 5, fill=1, stroke=0)
        c.setFillColor(self.t["white"])
        c.setFont("Helvetica-Bold", 8.5)
        title_str = self.title
        max_tw = w - 18
        while c.stringWidth(title_str, "Helvetica-Bold", 8.5) > max_tw and len(title_str) > 3:
            title_str = title_str[:-2]
        c.drawString(9, h - 14, title_str)
        text_w = w - 26
        y = h - 30
        for item in self.items:
            if not item.strip():
                y -= 5
                continue
            for i, ln in enumerate(wrap_text(c, item, "Helvetica", 8, text_w)):
                if y < 4: break
                if i == 0:
                    c.setFillColor(self.accent)
                    c.circle(13, y + 3, 1.8, fill=1, stroke=0)
                c.setFillColor(self.t["dark"])
                c.setFont("Helvetica", 8)
                c.drawString(20, y, ln)
                y -= 12


class HighlightBox(Flowable):
    """Caixa com fundo colorido suave e borda lateral. Mais "callout".
    Uso: HighlightBox("RED FLAGS", [...], "red", "red_light")
    """
    def __init__(self, title, items, accent="red", bg="red_light", width=None, theme=None):
        Flowable.__init__(self)
        self.title = title
        self.items = items
        self.t = theme or THEME
        self.accent = self.t[accent] if isinstance(accent, str) else accent
        self.bg = self.t[bg] if isinstance(bg, str) else bg
        self.bw = width
        self._h = 0

    def wrap(self, aw, ah):
        self.bw = min(self.bw or aw, aw)
        lh = 12
        total = sum(max(1, int(len(it) * 4.8 / (self.bw - 30)) + 1) for it in self.items if it.strip())
        self._h = max(34, 22 + total * lh + 6)
        return (self.bw, self._h)

    def draw(self):
        c = self.canv
        w, h = self.bw, self._h
        c.setFillColor(self.bg)
        c.roundRect(0, 0, w, h, 3.5, fill=1, stroke=0)
        c.setFillColor(self.accent)
        c.rect(0, 0, 3, h, fill=1, stroke=0)
        c.setFillColor(self.accent)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(10, h - 13, self.title)
        text_w = w - 28
        y = h - 26
        for item in self.items:
            if not item.strip():
                y -= 4
                continue
            for i, ln in enumerate(wrap_text(c, item, "Helvetica", 8, text_w)):
                if y < 4: break
                if i == 0:
                    c.setFillColor(self.accent)
                    c.circle(14, y + 3, 1.8, fill=1, stroke=0)
                c.setFillColor(self.t["dark"])
                c.setFont("Helvetica", 8)
                c.drawString(22, y, ln)
                y -= 12


class RxBox(Flowable):
    """Caixa de prescrição com badge "Rx".
    Uso: RxBox("MODELO — ENXAQUECA", ["Linha 1", "Linha 2"])
    """
    def __init__(self, title, lines, width=None, theme=None):
        Flowable.__init__(self)
        self.title = title
        self.lines = lines
        self.t = theme or THEME
        self.bw = width
        self._h = 0

    def wrap(self, aw, ah):
        self.bw = min(self.bw or aw, aw)
        total = sum(max(1, int(len(l) * 4.6 / (self.bw - 24)) + 1) for l in self.lines)
        self._h = max(32, 24 + total * 12 + 6)
        return (self.bw, self._h)

    def draw(self):
        c = self.canv
        w, h = self.bw, self._h
        c.setFillColor(HexColor("#FAFAFA"))
        c.setStrokeColor(self.t["gray"])
        c.setLineWidth(0.6)
        c.setDash(2.5, 2)
        c.roundRect(0, 0, w, h, 3.5, fill=1, stroke=1)
        c.setDash()
        c.setFillColor(self.t["teal"])
        c.roundRect(0, h - 18, 26, 18, 3.5, fill=1, stroke=0)
        c.setFillColor(self.t["white"])
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(13, h - 13, "Rx")
        c.setFillColor(self.t["navy"])
        c.setFont("Helvetica-Bold", 8.2)
        c.drawString(31, h - 13, self.title)
        text_w = w - 22
        y = h - 28
        c.setFont("Helvetica", 8)
        c.setFillColor(self.t["dark"])
        for line in self.lines:
            for ln in wrap_text(c, line, "Helvetica", 8, text_w):
                if y < 4: break
                c.drawString(11, y, ln)
                y -= 12


class CheckList(Flowable):
    """Lista de checklist com quadradinhos verdes.
    Uso: CheckList("CHECKLIST DE ALTA", [...])
    """
    def __init__(self, title, items, width=None, theme=None):
        Flowable.__init__(self)
        self.title = title
        self.items = items
        self.t = theme or THEME
        self.bw = width
        self._h = 0

    def wrap(self, aw, ah):
        self.bw = min(self.bw or aw, aw)
        total = sum(max(1, int(len(it) * 4.6 / (self.bw - 32)) + 1) for it in self.items)
        self._h = max(36, 22 + total * 13 + 6)
        return (self.bw, self._h)

    def draw(self):
        c = self.canv
        w, h = self.bw, self._h
        c.setFillColor(self.t["green_light"])
        c.roundRect(0, 0, w, h, 3.5, fill=1, stroke=0)
        c.setFillColor(self.t["green"])
        c.rect(0, 0, 3, h, fill=1, stroke=0)
        c.setFillColor(self.t["green"])
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(10, h - 13, self.title)
        text_w = w - 32
        y = h - 26
        for item in self.items:
            for i, ln in enumerate(wrap_text(c, item, "Helvetica", 8, text_w)):
                if y < 4: break
                if i == 0:
                    c.setStrokeColor(self.t["green"])
                    c.setFillColor(self.t["white"])
                    c.setLineWidth(0.6)
                    c.rect(11, y - 1, 7, 7, fill=1, stroke=1)
                c.setFillColor(self.t["dark"])
                c.setFont("Helvetica", 8)
                c.drawString(23, y, ln)
                y -= 13


class TwoCols(Flowable):
    """Dois flowables (caixas) lado a lado.
    Uso: TwoCols(InfoBox(...), InfoBox(...))
    """
    def __init__(self, left, right, gap=4*mm):
        Flowable.__init__(self)
        self.left = left
        self.right = right
        self.gap = gap

    def wrap(self, aw, ah):
        cw = (aw - self.gap) / 2
        self.left.bw = cw
        self.right.bw = cw
        _, lh = self.left.wrap(cw, ah)
        _, rh = self.right.wrap(cw, ah)
        self._h = max(lh, rh)
        self._cw = cw
        return (aw, self._h)

    def draw(self):
        c = self.canv
        self.left.drawOn(c, 0, self._h - self.left._h)
        self.right.drawOn(c, self._cw + self.gap, self._h - self.right._h)


# ═══════════════════════════════════════════════════════════
# TABELA COMPARATIVA
# ═══════════════════════════════════════════════════════════

class ComparisonTable(Flowable):
    """Tabela comparativa com header colorido por coluna e linhas alternadas.

    Uso:
        ComparisonTable(
            headers=["Característica", "Tipo A", "Tipo B", "Tipo C"],
            header_colors=["gray", "purple", "blue", "orange"],
            rows=[
                ("Localização", "Unilateral", "Bilateral", "Orbital"),
                ("Duração", "4-72h", "30min-7d", "15-180min"),
            ],
            col_widths=[0.25, 0.25, 0.25, 0.25],  # proporções (somam 1.0)
        )
    """
    def __init__(self, headers, header_colors, rows, col_widths=None, theme=None):
        Flowable.__init__(self)
        self.headers = headers
        self.t = theme or THEME
        self.header_colors = [self.t[c] if isinstance(c, str) else c for c in header_colors]
        self.rows = rows
        # col_widths: lista de proporções que somam ~1.0; se None, distribui igual
        if col_widths:
            self._col_ratios = col_widths
        else:
            n = len(headers)
            self._col_ratios = [1.0 / n] * n

    def wrap(self, aw, ah):
        self.w = aw
        self.row_h = 26
        self.header_h = 18
        # Calcula altura necessária por linha (auto-expand para multi-line)
        max_lines_per_row = []
        for row in self.rows:
            max_l = max(len(str(cell).split("\n")) for cell in row)
            max_lines_per_row.append(max_l)
        self._row_heights = [max(self.row_h, 10 + ml * 9) for ml in max_lines_per_row]
        self._h = self.header_h + sum(self._row_heights) + 4
        return (aw, self._h)

    def _get_col_xs(self):
        """Retorna lista de (x_start, col_width) para cada coluna."""
        cols = []
        x = 0
        for ratio in self._col_ratios:
            cw = self.w * ratio
            cols.append((x, cw))
            x += cw
        return cols

    def _draw_text_in_cell(self, c, text, x, y, cw, rh, bold=False):
        """Desenha texto centralizado na célula, com word-wrap se necessário."""
        font_name = "Helvetica-Bold" if bold else "Helvetica"
        font_size = 7.5
        c.setFont(font_name, font_size)
        
        lines = text.split("\n")
        # Para cada linha, verifica se cabe na largura da coluna
        final_lines = []
        for line in lines:
            line_w = c.stringWidth(line, font_name, font_size)
            if line_w <= cw - 6:  # 6pt de padding
                final_lines.append(line)
            else:
                # Word wrap manual
                words = line.split()
                current = ""
                for word in words:
                    test = (current + " " + word).strip()
                    if c.stringWidth(test, font_name, font_size) <= cw - 6:
                        current = test
                    else:
                        if current:
                            final_lines.append(current)
                        current = word
                if current:
                    final_lines.append(current)
        
        line_h = 9
        total_text_h = len(final_lines) * line_h
        start_y = y + rh / 2 + (len(final_lines) - 1) * line_h / 2 - 3
        for li, ln in enumerate(final_lines):
            c.drawCentredString(x + cw / 2, start_y - li * line_h, ln)

    def draw(self):
        c = self.canv
        w, h = self.w, self._h
        cols = self._get_col_xs()

        # Header
        for i, (label, col_color) in enumerate(zip(self.headers, self.header_colors)):
            x, cw = cols[i]
            c.setFillColor(col_color)
            c.rect(x, h - self.header_h, cw, self.header_h, fill=1, stroke=0)
            c.setFillColor(self.t["white"])
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(x + cw / 2, h - self.header_h / 2 - 3, label)

        # Rows
        cum_y = h - self.header_h
        for r, row in enumerate(self.rows):
            rh = self._row_heights[r]
            row_y = cum_y - rh
            row_bg = self.t["white"] if r % 2 == 0 else self.t["gray_light"]
            for ci, cell in enumerate(row):
                x, cw = cols[ci]
                c.setFillColor(row_bg)
                c.setStrokeColor(self.t["gray_line"])
                c.setLineWidth(0.3)
                c.rect(x, row_y, cw, rh, fill=1, stroke=1)
                c.setFillColor(self.t["dark"])
                self._draw_text_in_cell(c, cell, x, row_y, cw, rh, bold=(ci == 0))
            cum_y = row_y


# ═══════════════════════════════════════════════════════════
# FLUXOGRAMA GENÉRICO
# ═══════════════════════════════════════════════════════════

class FlowChart(Flowable):
    """Fluxograma customizável com nodes e arrows.

    Uso:
        FlowChart(
            title="FLUXOGRAMA DE CONDUTA",
            height=230,
            nodes=[
                {"id": "start", "x": 0.5, "y": 0.92, "w": 100, "h": 18, "text": "INÍCIO", "color": "navy"},
                {"id": "step1", "x": 0.5, "y": 0.72, "w": 130, "h": 18, "text": "AVALIAÇÃO", "color": "teal"},
                {"id": "yes",   "x": 0.25, "y": 0.5, "w": 110, "h": 22, "text": "RED FLAG\nPositivo", "color": "red"},
                {"id": "no",    "x": 0.75, "y": 0.5, "w": 110, "h": 22, "text": "RED FLAG\nNegativo", "color": "green"},
            ],
            arrows=[
                ("start", "step1"),
                ("step1", "yes"),
                ("step1", "no"),
            ]
        )

    x e y nos nodes são proporções (0-1) da largura/altura do fluxograma.
    """
    def __init__(self, title, nodes, arrows, height=230, theme=None):
        Flowable.__init__(self)
        self.title = title
        self.nodes = {n["id"]: n for n in nodes}
        self.arrows = arrows
        self.height = height
        self.t = theme or THEME

    def wrap(self, aw, ah):
        self.w = aw
        return (aw, self.height)

    TITLE_BAND = 26  # altura reservada para o título no topo

    def _box(self, c, node):
        w, h = self.w, self.height
        usable_h = h - self.TITLE_BAND
        # Calcular posição absoluta a partir das proporções (dentro da área útil)
        cx = node["x"] * w
        cy = node["y"] * usable_h
        bw = node["w"]
        bh = node["h"]
        x = cx - bw / 2
        y = cy - bh / 2
        color = self.t[node["color"]] if isinstance(node["color"], str) else node["color"]
        c.setFillColor(color)
        c.setStrokeColor(self.t["dark"])
        c.setLineWidth(0.6)
        c.roundRect(x, y, bw, bh, 4, fill=1, stroke=1)
        c.setFillColor(self.t["white"])
        font_size = node.get("font_size", 8)
        c.setFont("Helvetica-Bold", font_size)
        lines = node["text"].split("\n")
        line_h = font_size + 2
        start_y = y + bh / 2 + (len(lines) - 1) * line_h / 2 - 3
        for i, ln in enumerate(lines):
            c.drawCentredString(cx, start_y - i * line_h, ln)
        # Retorna bbox para conexões
        node["_bbox"] = (x, y, x + bw, y + bh, cx, cy)

    def _arrow(self, c, from_id, to_id):
        nf = self.nodes[from_id]
        nt = self.nodes[to_id]
        _, _, _, _, fcx, fcy = nf["_bbox"]
        _, _, _, _, tcx, tcy = nt["_bbox"]
        fx1, fy1, fx2, fy2, _, _ = nf["_bbox"]
        tx1, ty1, tx2, ty2, _, _ = nt["_bbox"]
        # Saída: borda inferior do node origem (assumindo top-down)
        if tcy < fcy:
            x1, y1 = fcx, fy1
            x2, y2 = tcx, ty2
        else:
            x1, y1 = fcx, fy2
            x2, y2 = tcx, ty1
        # Ajuste lateral
        if abs(tcx - fcx) > 30:
            x1 = fcx + (15 if tcx > fcx else -15)
        c.setStrokeColor(self.t["dark"])
        c.setLineWidth(1)
        c.line(x1, y1, x2, y2)
        # Cabeça da seta
        angle = math.atan2(y2 - y1, x2 - x1)
        ah = 5
        c.setFillColor(self.t["dark"])
        p = c.beginPath()
        p.moveTo(x2, y2)
        p.lineTo(x2 - ah * math.cos(angle - math.pi/6), y2 - ah * math.sin(angle - math.pi/6))
        p.lineTo(x2 - ah * math.cos(angle + math.pi/6), y2 - ah * math.sin(angle + math.pi/6))
        p.close()
        c.drawPath(p, fill=1, stroke=0)

    def draw(self):
        c = self.canv
        w, h = self.w, self.height
        c.setFillColor(self.t["white"])
        c.setStrokeColor(self.t["gray_line"])
        c.setLineWidth(0.5)
        c.roundRect(0, 0, w, h, 4, fill=1, stroke=1)
        c.setFillColor(self.t["navy"])
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(w / 2, h - 16, self.title)
        # Desenha boxes primeiro (para preencher _bbox)
        for node in self.nodes.values():
            self._box(c, node)
        # Depois setas
        for from_id, to_id in self.arrows:
            self._arrow(c, from_id, to_id)


# ═══════════════════════════════════════════════════════════
# QUESTÕES E GABARITO
# ═══════════════════════════════════════════════════════════

class QuestionBox(Flowable):
    """Caixa de questão de prova com alternativas A-E.

    Uso:
        QuestionBox(
            num=1,
            source="USP-SP / Adaptada",
            statement="Paciente com cefaleia...",
            options=["Alternativa A", "Alternativa B", ...]
        )
    """
    def __init__(self, num, source, statement, options, width=None, theme=None):
        Flowable.__init__(self)
        self.num = num
        self.source = source
        self.statement = statement
        self.options = options
        self.t = theme or THEME
        self.bw = width
        self._h = 0

    def wrap(self, aw, ah):
        self.bw = min(self.bw or aw, aw)
        text_w = self.bw - 24
        st_lines = max(2, int(len(self.statement) * 4.2 / text_w) + 1)
        opt_lines = sum(max(1, int(len(o) * 4.2 / (text_w - 14)) + 1) for o in self.options)
        self._h = 26 + st_lines * 11 + 4 + opt_lines * 11 + 8
        return (self.bw, self._h)

    def draw(self):
        c = self.canv
        w, h = self.bw, self._h
        c.setFillColor(self.t["white"])
        c.setStrokeColor(self.t["navy"])
        c.setLineWidth(0.8)
        c.roundRect(0, 0, w, h, 4, fill=1, stroke=1)
        c.setFillColor(self.t["navy"])
        c.roundRect(0, h - 18, w, 18, 4, fill=1, stroke=0)
        c.rect(0, h - 18, w, 5, fill=1, stroke=0)
        c.setFillColor(self.t["white"])
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(10, h - 13, f"QUESTÃO {self.num}")
        c.setFont("Helvetica", 7.5)
        c.drawRightString(w - 10, h - 13, self.source)
        text_w = w - 20
        y = h - 30
        c.setFillColor(self.t["dark"])
        c.setFont("Helvetica", 8)
        for ln in wrap_text(c, self.statement, "Helvetica", 8, text_w):
            c.drawString(10, y, ln)
            y -= 11
        y -= 3
        for i, opt in enumerate(self.options):
            letter = chr(65 + i)
            c.setFillColor(self.t["teal"])
            c.setFont("Helvetica-Bold", 8)
            c.drawString(12, y, f"{letter})")
            c.setFillColor(self.t["dark"])
            c.setFont("Helvetica", 8)
            for ln in wrap_text(c, opt, "Helvetica", 8, text_w - 16):
                c.drawString(24, y, ln)
                y -= 11


class AnswerBox(Flowable):
    """Caixa de gabarito comentado (verde).

    Uso:
        AnswerBox(num=1, answer="C — Iniciar profilaxia",
                  comment="Paciente com >4 crises/mês tem indicação...")
    """
    def __init__(self, num, answer, comment, width=None, theme=None):
        Flowable.__init__(self)
        self.num = num
        self.answer = answer
        self.comment = comment
        self.t = theme or THEME
        self.bw = width
        self._h = 0

    def wrap(self, aw, ah):
        self.bw = min(self.bw or aw, aw)
        text_w = self.bw - 24
        n = max(2, int(len(self.comment) * 4.2 / text_w) + 1)
        self._h = 22 + n * 11 + 6
        return (self.bw, self._h)

    def draw(self):
        c = self.canv
        w, h = self.bw, self._h
        c.setFillColor(self.t["green_light"])
        c.roundRect(0, 0, w, h, 3.5, fill=1, stroke=0)
        c.setFillColor(self.t["green"])
        c.rect(0, 0, 3, h, fill=1, stroke=0)
        c.setFillColor(self.t["green"])
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(10, h - 14, f"QUESTÃO {self.num}  →  Resposta: {self.answer}")
        text_w = w - 22
        y = h - 28
        c.setFillColor(self.t["dark"])
        c.setFont("Helvetica", 8)
        for ln in wrap_text(c, self.comment, "Helvetica", 8, text_w):
            c.drawString(10, y, ln)
            y -= 11
