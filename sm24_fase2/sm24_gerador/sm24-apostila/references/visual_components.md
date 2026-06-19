# Catálogo de Componentes Visuais

Este arquivo documenta todos os componentes (`Flowables`) disponíveis na biblioteca SM24, com exemplos de uso e quando usar cada um.

## Índice

1. [Títulos e Estrutura](#títulos-e-estrutura)
2. [Caixas de Conteúdo](#caixas-de-conteúdo)
3. [Layout em Colunas](#layout-em-colunas)
4. [Tabelas Comparativas](#tabelas-comparativas)
5. [Fluxogramas](#fluxogramas)
6. [Questões e Gabarito](#questões-e-gabarito)
7. [Paleta de Cores](#paleta-de-cores)

---

## Títulos e Estrutura

### `ChapterBar(title)`

Barra de título de capítulo, fundo navy, ocupa largura toda. Use no topo da primeira página de cada capítulo e no início de seções especiais (ex: questões).

```python
story.append(ChapterBar("CEFALEIA NO ADULTO"))
```

### `SectionTitle(text, color="teal")`

Título de seção com barra lateral colorida. A cor sinaliza o tom do conteúdo:
- `"teal"` (padrão) — informativo, neutro
- `"red"` — alerta, red flags, urgência
- `"green"` — checklist, OK, alta
- `"purple"` — diagnóstico específico
- `"orange"` — atenção, transferência
- `"blue"` — diagnóstico alternativo

```python
story.append(SectionTitle("ANAMNESE DIRECIONADA"))
story.append(SectionTitle("RED FLAGS", color="red"))
story.append(SectionTitle("CHECKLIST DE ALTA", color="green"))
```

---

## Caixas de Conteúdo

Existem **três tipos** de caixa, usadas para fins diferentes:

### `InfoBox(title, items, accent="teal")`

Caixa **branca** com **header colorido sólido** e bullets coloridos.
Visual mais "tabela", apropriada para listas técnicas, mnemônicos, critérios.

```python
InfoBox("MNEMÔNICO SOCRATES", [
    "Site: localização",
    "Onset: início súbito ou gradual",
    "Característica: pulsátil, aperto, pontada",
    # ...
], "teal")
```

**Quando usar:** mnemônicos, listas de critérios, checklist de avaliação técnica.

### `HighlightBox(title, items, accent, bg)`

Caixa com **fundo colorido suave** e **borda lateral colorida**. Visual de "callout".

```python
HighlightBox("EXIGEM INVESTIGAÇÃO IMEDIATA", [
    "Cefaleia súbita 'pior da vida'",
    "Déficit neurológico focal",
], "red", "red_light")
```

**Quando usar:** alertas, perguntas-chave ao paciente, condutas imediatas, observações importantes. Sempre que quiser que o leitor _olhe direto_ para aquela informação.

**Combinações de cor mais usadas:**
- Red flags: `"red"` + `"red_light"`
- Perguntas-chave: `"purple"` + `"purple_light"`
- Conduta imediata: `"orange"` + `"orange_light"`
- Tratamento: `"teal"` + `"teal_bg"`
- Diagnóstico específico: `"blue"` + `"teal_bg"`

### `RxBox(title, lines)`

Caixa de **prescrição médica**, com badge "Rx" e borda tracejada cinza.

```python
RxBox("MODELO — ENXAQUECA (crise)", [
    "1. SF 0,9% 500mL EV",
    "2. Dipirona 1g EV + Metoclopramida 10mg EV",
    "3. Cetoprofeno 100mg EV",
])
```

**Quando usar:** sempre que apresentar uma receita ou prescrição passo-a-passo. NÃO use para listas de medicações que não são uma prescrição completa (use `HighlightBox` para isso).

### `CheckList(title, items)`

Caixa **verde** com itens precedidos de quadradinhos para marcar.

```python
CheckList("CHECKLIST DE ALTA", [
    "Dor controlada (intensidade < 4/10)",
    "Exame neurológico normal documentado",
    "Receita explicada ao paciente",
])
```

**Quando usar:** itens que devem ser conferidos antes de uma decisão (alta, transferência, encerramento de caso).

---

## Layout em Colunas

### `TwoCols(left, right)`

Coloca dois flowables lado a lado com gap de 4mm. Útil para comparações ou para economizar espaço vertical.

```python
TwoCols(
    InfoBox("CEFALEIA PRIMÁRIA", [...], "teal"),
    InfoBox("CEFALEIA SECUNDÁRIA", [...], "red"),
)
```

**Padrão recomendado:** clínica × tratamento, primária × secundária, ou opções A × B.

---

## Tabelas Comparativas

### `ComparisonTable(headers, header_colors, rows)`

Tabela com headers coloridos por coluna e linhas alternadas (zebra).

```python
ComparisonTable(
    headers=["", "ENXAQUECA", "TENSIONAL", "EM SALVAS"],
    header_colors=["gray", "purple", "blue", "orange"],
    rows=[
        ("Localização", "Unilateral", "Bilateral", "Orbital"),
        ("Duração", "4-72h", "30min-7d", "15-180min"),
        # Use \n para quebra de linha dentro da célula
        ("Sintomas\nassociados", "Foto/fonofobia", "Hipertonia", "Lacrimejamento"),
    ]
)
```

**Quando usar:** comparações entre 2-4 entidades clínicas com várias características.

**Dica:** primeira coluna geralmente é o "rótulo" da linha, com header `""` e cor `"gray"`.

---

## Fluxogramas

### `FlowChart(title, nodes, arrows, height=230)`

Fluxograma com nodes posicionados por proporção (0-1) da largura/altura.

```python
FlowChart(
    title="FLUXOGRAMA DE CONDUTA",
    height=230,
    nodes=[
        {"id": "start",  "x": 0.5,  "y": 0.92, "w": 100, "h": 18,
         "text": "CEFALEIA", "color": "navy"},
        {"id": "avalia", "x": 0.5,  "y": 0.7, "w": 150, "h": 18,
         "text": "ANAMNESE + EXAME", "color": "teal", "font_size": 7.5},
        {"id": "alarme", "x": 0.25, "y": 0.45, "w": 110, "h": 22,
         "text": "RED FLAGS\nPositivo", "color": "red"},
        {"id": "ok",     "x": 0.75, "y": 0.45, "w": 110, "h": 22,
         "text": "RED FLAGS\nNegativo", "color": "green"},
    ],
    arrows=[
        ("start", "avalia"),
        ("avalia", "alarme"),
        ("avalia", "ok"),
    ]
)
```

**Posicionamento:**
- `x` e `y` são proporções de 0 a 1 (não pixels)
- `(0,0)` é canto inferior esquerdo, `(1,1)` é canto superior direito
- `w` e `h` são em pontos (≈ 1/72 polegada)
- Setas conectam pelos centros, ajustadas automaticamente

**Texto multilinha:** use `\n` em `"text"`.

**Tamanho de fonte:** padrão 8, ajuste com `"font_size": 7.5` se texto ficar cortado.

---

## Questões e Gabarito

### `QuestionBox(num, source, statement, options)`

Caixa de questão de prova com header navy, fonte e enunciado, alternativas A-E.

```python
QuestionBox(
    num=1,
    source="USP-SP / Adaptada",
    statement="Mulher, 28 anos, com cefaleia recorrente há 5 anos. "
              "Refere crises pulsáteis, hemicranianas, com fotofobia. "
              "Qual a conduta mais adequada?",
    options=[
        "Iniciar Dipirona conforme demanda",
        "Iniciar Sumatriptano em todas as crises",
        "Iniciar profilaxia com Propranolol",
        "Solicitar TC de crânio",
        "Iniciar Topiramato 200mg/dia",
    ]
)
```

### `AnswerBox(num, answer, comment)`

Caixa verde com gabarito comentado.

```python
AnswerBox(
    num=1,
    answer="C — Iniciar profilaxia com Propranolol",
    comment="Paciente com >4 crises incapacitantes/mês tem indicação "
            "de profilaxia. Propranolol é primeira linha (nível A). "
            "Sumatriptano é tratamento de crise, não profilaxia."
)
```

**Estrutura padrão da seção de questões (no fim do capítulo):**

```python
story.append(PageBreak())
story.append(ChapterBar("FIXAÇÃO — QUESTÕES DE RESIDÊNCIA"))
story.append(sp(3))

# Instruções
story.append(KeepTogether(HighlightBox(
    "INSTRUÇÕES", [
        "5 questões selecionadas dos principais concursos",
        "Tente responder antes de consultar o gabarito",
    ], "teal", "teal_bg"
)))
story.append(sp(3))

# Questões 1-5
for q in questions:
    story.append(KeepTogether(QuestionBox(...)))
    story.append(sp(2))

# Gabarito
story.append(SectionTitle("GABARITO COMENTADO", color="green"))
story.append(sp(2))
for a in answers:
    story.append(KeepTogether(AnswerBox(...)))
    story.append(sp(2))
```

---

## Paleta de Cores

Acesse via `THEME["chave"]` ou passe a string da chave nos componentes.

| Chave | Uso recomendado |
|-------|----------------|
| `navy` | Header, badges, botões principais |
| `blue` | Diagnósticos alternativos |
| `teal` | Accent geral, informativo |
| `teal_light` / `teal_bg` | Background suave para teal |
| `red` | Red flags, alertas, urgência |
| `red_light` | Background suave para red |
| `green` | Checklists, alta, OK |
| `green_light` | Background para green |
| `orange` | Atenção, transferência, SAMU |
| `orange_light` | Background para orange |
| `purple` | Diagnósticos específicos |
| `purple_light` | Background para purple |
| `gray` | Texto secundário, primeiras colunas de tabela |
| `gray_light` | Linhas alternadas |
| `gray_line` | Bordas finas |
| `dark` | Texto principal |

---

## Helpers de Construção

### `make_doc(...)`

Cria o `BaseDocTemplate` configurado com header, footer e watermark. Sempre comece o script com isso. Veja parâmetros completos em `lib/builder.py`.

```python
doc, story = make_doc(
    output_path="cefaleia.pdf",
    title="SM24 — Cefaleia no Adulto",
    chapter_subject="Cefaleia no Adulto",  # aparece no header
    series_tag="NEUROLOGIA",  # pill colorida
)
```

### `block(title, *content, after=2.5)`

Agrupa título de seção + primeiro conteúdo num `KeepTogether` para evitar título órfão no fim de página.

```python
story.extend(block(
    SectionTitle("ANAMNESE"),
    InfoBox("SOCRATES", [...], "teal"),
    after=3  # mm de spacer depois do bloco
))
```

### `sp(mm_h)`

Spacer em milímetros.

```python
story.append(sp(3))  # 3mm de espaço vertical
```

### `KeepTogether(flowable)`

Importe direto de `reportlab.platypus`. Use para impedir que uma caixa grande seja partida entre páginas.

```python
from reportlab.platypus import KeepTogether
story.append(KeepTogether(HighlightBox(...)))
```

### `PageBreak()`

Importe de `reportlab.platypus`. Use para forçar quebra (ex: questões em página separada).

```python
from reportlab.platypus import PageBreak
story.append(PageBreak())
```
