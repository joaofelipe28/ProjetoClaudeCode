# SCHEMA — Gerador Universal de Apostilas SM24

Cada apostila é um arquivo `.json`. O gerador (`build_apostila.py`) lê o JSON e produz o PDF.

## Estrutura raiz

```jsonc
{
  "slug": "sepse",                    // OBRIGATÓRIO — nome do arquivo (apostila_<slug>.pdf)
  "titulo": "Sepse e Choque Séptico", // OBRIGATÓRIO
  "especialidade": "CLÍNICA MÉDICA",  // OBRIGATÓRIO — vira a pill no header
  "chapter_subject": "...",           // opcional — texto do header (default = titulo)
  "chapter_bar": "...",               // opcional — barra de título (default = titulo em CAIXA ALTA)
  "secoes": [ ... ],                  // OBRIGATÓRIO — corpo da apostila
  "questoes": [ ... ],                // opcional — 5 questões de residência
  "gabarito": [ ... ]                 // opcional — deve ter MESMO nº de itens que questoes
}
```

## Seções (`secoes`) — tipos disponíveis

Toda seção pode ter `section_title` (string) e `section_color` (cor) para o título com barra lateral.

### flowchart
```jsonc
{
  "tipo": "flowchart",
  "section_title": "FLUXOGRAMA",
  "title": "TÍTULO DENTRO DA CAIXA",
  "height": 210,                      // opcional, default 220
  "nodes": [
    {"id": "a", "x": 0.5, "y": 0.9, "w": 190, "h": 20, "text": "Texto\nquebra", "color": "navy", "font_size": 6.2}
  ],
  "arrows": [["a", "b"], ["b", "c"]]  // pares [origem, destino] usando os ids
}
```
- `x`,`y`: proporções 0-1 (posição no fluxograma). y=0.9 é topo, y=0.1 é base.
- `w`,`h`: largura/altura do nó em pontos. Mantenha w<=200, h 20-28.
- `font_size`: 6-7 para textos longos, evita corte.
- Use `\n` no text para quebra de linha.

### infobox (caixa branca, header colorido)
```jsonc
{ "tipo": "infobox", "titulo": "DEFINIÇÃO", "items": ["linha 1", "linha 2"], "accent": "teal" }
```

### highlightbox (caixa colorida — red flags, conceitos)
```jsonc
{ "tipo": "highlightbox", "titulo": "RED FLAGS", "items": [...], "accent": "red", "bg": "red_light" }
```

### rxbox (prescrição — fundo tracejado, ícone Rx)
```jsonc
{ "tipo": "rxbox", "titulo": "TRATAMENTO", "items": ["1. ...", "2. ..."] }
```

### checklist
```jsonc
{ "tipo": "checklist", "titulo": "CHECKLIST DE ALTA", "items": [...] }
```

### comparison_table
```jsonc
{
  "tipo": "comparison_table",
  "headers": ["Col A", "Col B", "Col C"],
  "header_colors": ["gray", "navy", "teal"],   // 1 por coluna
  "col_widths": [0.20, 0.25, 0.55],            // proporções somando ~1.0 (IMPORTANTE p/ não cortar)
  "rows": [ ["a1","b1","c1"], ["a2","b2","c2"] ] // cada row = nº de colunas
}
```

### twocols (dois componentes lado a lado)
```jsonc
{
  "tipo": "twocols",
  "section_title": "...",
  "left":  { "tipo": "rxbox", "titulo": "...", "items": [...] },
  "right": { "tipo": "infobox", "titulo": "...", "items": [...] }
}
```
Aceita dentro: infobox, highlightbox, rxbox, checklist, comparison_table.

### spacer
```jsonc
{ "tipo": "spacer", "mm": 3 }
```

## Questões e Gabarito

```jsonc
"questoes": [
  {
    "source": "UNIFESP / Adaptada",
    "enunciado": "...",
    "alternativas": ["A...", "B...", "C...", "D...", "E..."]
  }
],
"gabarito": [
  { "resposta": "B", "comentario": "..." }
]
```

## CORES disponíveis (accent / section_color / header_colors / node color)
`navy` `blue` `teal` `teal_light` `red` `red_light` `green` `green_light`
`orange` `orange_light` `purple` `purple_light` `gray` `gray_light` `dark`

Pares accent+bg comuns para highlightbox:
- Red flags: `accent:red, bg:red_light`
- Conceito/destaque: `accent:purple, bg:purple_light`
- Atenção: `accent:orange, bg:orange_light`
- Info: `accent:teal, bg:teal_light`

## PRESETS de col_widths (testados, não cortam)
- 2 colunas equilibradas: `[0.30, 0.70]`
- 3 col (rótulo + 2 dados): `[0.22, 0.39, 0.39]`
- 3 col (rótulo curto + texto longo à direita): `[0.18, 0.35, 0.47]` ou `[0.20, 0.25, 0.55]`
- 4 col: `[0.25, 0.25, 0.25, 0.25]` — EVITAR textos longos; preferir abreviar
- 5 col: desaconselhado — dividir em 2 tabelas de 3

## REGRAS DE OURO (evitam corte / overflow)
1. Caracteres subscrito/sobrescrito Unicode (₂ ² ↑ ↓) → usar O2, x10³ funciona, mas para setas em tabela use `->`, `+`, `-`.
   (A fonte Helvetica renderiza ² ³ ↑ ↓ ok; mas ₂ subscrito NÃO — vira ■.)
2. Tabela com texto longo → sempre definir col_widths e dar mais espaço à coluna densa.
3. Mais de 4 colunas → quebrar em duas tabelas.
4. Flowchart → no máx 4-5 nós, font_size 6-6.5 para textos com \n.
5. questoes e gabarito SEMPRE com o mesmo número de itens.

## USO
```bash
# validar sem gerar
python3 build_apostila.py jsons/sepse.json --validate-only

# gerar 1
python3 build_apostila.py jsons/sepse.json --outdir /mnt/user-data/outputs

# gerar em lote (todos os .json de uma pasta)
python3 build_apostila.py --batch jsons/ --outdir /mnt/user-data/outputs
```
