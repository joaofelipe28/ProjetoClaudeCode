---
name: sm24-apostila
description: Use this skill whenever the user wants to create educational PDF coursebooks (apostilas) for SM24 — a Brazilian medical support platform for emergency on-call physicians. This skill produces professional, branded PDF chapters with the SM24 visual identity (navy + teal palette, watermarked logo, structured boxes, flowcharts, comparison tables, prescription models, and residency exam questions). Trigger on phrases like "fazer apostila SM24", "novo capítulo do cursinho SM24", "material para SM24", "protocolo clínico SM24", "criar capítulo de [doença] SM24", or any request to produce a clinical protocol PDF chapter in the SM24 series. Also use when the user wants to adapt this layout/template for similar branded medical education materials.
license: Proprietary — uso interno SM24
---

# SM24 Apostila — Skill para criar capítulos de protocolos clínicos

Esta skill cria apostilas em PDF com a identidade visual da SM24 (Suporte Médico 24h). Cada apostila é um capítulo da série "Protocolos Clínicos", com estrutura modular: fluxograma → anamnese → red flags → tratamento → receitas → questões de residência.

## Quando usar

Trigger quando o usuário pedir para criar:
- Capítulos de apostila SM24 sobre um tema clínico (cefaleia, AVC, sepse, etc.)
- Material didático para a série "Protocolos Clínicos" da SM24
- Adaptações com paleta/logo customizados (mesmo template visual)

Fluxo típico do usuário:
1. "Quero fazer um capítulo sobre [tema]"
2. Usuário envia rascunho de conteúdo (texto, lista de tópicos, ou referências)
3. Claude gera o PDF aplicando os componentes visuais e estrutura padrão
4. Iteração: ajustes de espaçamento, cor, estrutura, adição de questões

## Como usar (workflow para Claude)

### 1. Entender o tema e o conteúdo

Antes de codar, confirme com o usuário:
- **Tema do capítulo** (ex: "Convulsão no adulto")
- **Especialidade** para o `series_tag` no header (ex: "NEUROLOGIA")
- **Conteúdo bruto** — pode ser PDF anterior, texto colado, lista de tópicos, ou pedido do tipo "monta um capítulo padrão sobre X"

Se o usuário não enviou conteúdo, ofereça duas rotas:
- **(a)** Você (Claude) elabora o conteúdo a partir do conhecimento médico padrão sobre o tema
- **(b)** Usuário envia material bruto e você só formata

### 2. Ler os arquivos de referência

Antes de gerar o PDF, sempre leia:
- `references/visual_components.md` — catálogo completo dos componentes
- `references/content_template.md` — estrutura padrão de capítulo + adaptações por tipo

### 3. Estruturar o capítulo

Use `references/content_template.md` para escolher quais seções incluir. **A estrutura é flexível** — alguns temas pedem ABCDE primeiro, outros pedem classificação primeiro, etc.

Estrutura **base** (use como ponto de partida e adapte):
1. `ChapterBar` com título
2. Fluxograma de visão geral (`FlowChart`)
3. Anamnese (`InfoBox` teal)
4. Perguntas-chave (`HighlightBox` purple)
5. Exame físico (`InfoBox` green)
6. Red flags (`HighlightBox` red) + Conduta imediata (`HighlightBox` orange)
7. Classificação (`TwoCols`) + Tabela comparativa (`ComparisonTable`)
8. Subtipos/diagnósticos com características + tratamento + receita
9. Critérios de internação (`HighlightBox` red)
10. Checklist de alta (`CheckList` green)
11. Modelos de receita (`RxBox`)
12. Passagem SAMU (`HighlightBox` orange)
13. `PageBreak` → Questões (`ChapterBar` + `QuestionBox` x 3-5)
14. Gabarito comentado (`AnswerBox` x N)

### 4. Escrever o script Python

Use `examples/exemplo_minimo.py` como template inicial. Copie para o diretório de trabalho e edite.

```python
from lib import (
    make_doc, block, sp,
    ChapterBar, SectionTitle,
    InfoBox, HighlightBox, RxBox, CheckList,
    TwoCols, ComparisonTable, FlowChart,
    QuestionBox, AnswerBox,
)
from reportlab.platypus import KeepTogether, PageBreak

doc, story = make_doc(
    output_path="apostila_NOME.pdf",
    title="SM24 — TEMA",
    chapter_subject="Tema do Capítulo",
    series_tag="NEUROLOGIA",  # ajustar
)

story.append(ChapterBar("TÍTULO"))
story.append(sp(3))

# ... seções ...

doc.build(story)
```

### 5. Padrões importantes ao escrever

**Sempre** use `block()` ou `KeepTogether()` para evitar título órfão no fim de página:
```python
story.extend(block(
    SectionTitle("ANAMNESE"),
    InfoBox("MNEMÔNICO", [...], "teal")
))
```

**Sempre** use `sp(N)` para spacers em milímetros (não use `Spacer` direto).

**Sempre** envolva caixas grandes (red flags, checklist, SAMU, questões longas) em `KeepTogether()`:
```python
story.append(KeepTogether(HighlightBox("RED FLAGS", [...], "red", "red_light")))
```

**Cores devem ser passadas como string** (chave do THEME) sempre que possível:
```python
SectionTitle("ALERTAS", color="red")  # bom
SectionTitle("ALERTAS", color=THEME["red"])  # também funciona, mas verboso
```

### 6. Gerar e revisar

Após gerar o PDF:
1. Verifique o número de páginas (`pypdf.PdfReader` → `len(reader.pages)`)
2. Rasterize 2-3 páginas-chave para inspeção visual (`pdftoppm -jpeg -r 100`)
3. Procure problemas comuns:
   - Texto cortado em FlowChart (ajustar `font_size` ou `w` do node)
   - Título órfão (envolver em `KeepTogether`)
   - Caixa cortando entre páginas (envolver em `KeepTogether`)
   - Espaço excessivo (reduzir `sp()` ou `after` do `block()`)

### 7. Customização para outros projetos

Se o usuário quiser usar o template para um projeto **não-SM24** (paleta/logo diferentes):

```python
from lib.flowables import THEME

# Cria tema customizado a partir do padrão
custom_theme = dict(THEME)
custom_theme["navy"] = HexColor("#0A4D3C")  # verde escuro
custom_theme["teal"] = HexColor("#16A085")  # verde claro

doc, story = make_doc(
    output_path="material.pdf",
    title="Outro Cursinho",
    series_tag="CARDIOLOGIA",
    series_name="Cursinho XYZ",
    logo_path="/caminho/para/logo_xyz.png",
    theme=custom_theme,
)
```

## Estrutura desta skill

```
sm24-apostila/
├── SKILL.md                       (este arquivo)
├── assets/
│   └── logo_sm24.png              (logo oficial — usado em capa e watermark)
├── lib/
│   ├── __init__.py                (exports)
│   ├── flowables.py               (todos os componentes visuais)
│   └── builder.py                 (make_doc, block, sp helpers)
├── examples/
│   └── exemplo_minimo.py          (template inicial — copie e edite)
└── references/
    ├── visual_components.md       (catálogo de componentes — LEIA PRIMEIRO)
    └── content_template.md        (estrutura padrão de capítulo)
```

## Dicas finais

- **Conteúdo médico:** sempre escreva com base em fontes confiáveis (Manole, MedCurso, diretrizes brasileiras como ABN, SBC, SBN). Quando inventar conteúdo, sinalize ao usuário e peça revisão.
- **Questões de prova:** prefira questões de USP, UNIFESP, UFRJ, UNICAMP, AMRIGS, SES-DF, SUS-SP. Marque sempre como "Adaptada" se houve modificação.
- **Receitas:** sempre com dose, via, frequência. Use OU em maiúsculas para alternativas.
- **Tom:** direto, prescritivo, manual de plantão. Não-acadêmico.
- **Densidade:** ~4 páginas de conteúdo + 1 de questões. Se ultrapassar, divida.
- **Iteração:** depois de gerar, ofereça ajustes sem o usuário precisar pedir explicitamente — espaçamento, cores, ordem das seções.
