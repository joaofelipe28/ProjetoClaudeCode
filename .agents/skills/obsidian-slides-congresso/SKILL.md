---
name: obsidian-slides-congresso
description: >
  Use esta skill quando o usuário enviar fotos de slides de congresso médico,
  palestra, simpósio ou qualquer material acadêmico em imagem e quiser converter
  em notas estruturadas no vault Obsidian. Grava os arquivos diretamente no vault
  — sem download manual, sem .zip. Trigger: "processar slides", "fotos do congresso",
  "transformar em notas Obsidian", "slides do ABN/SBN/CBTM", ou simplesmente ao
  receber fotos de slides com intenção de estudo.
---

# Skill: obsidian-slides-congresso

Converte fotos de slides de congresso em notas Obsidian estruturadas, gravadas **diretamente** no vault — sem .zip, sem download manual.

---

## VAULT

```
/Users/joaofelipescheidt/Library/Mobile Documents/iCloud~md~obsidian/Documents/Joao's Mind
```

Pastas relevantes:
- Notas: `20-Literatura/palestras/[PREFIXO]/`
- Flashcards CSV: `_flashcards-csv/`

---

## PASSO 0 — Coletar metadados (SEMPRE executar primeiro)

Antes de ler qualquer imagem, pergunte ao usuário:

```
Antes de processar os slides, preciso de algumas informações que podem não estar visíveis nas fotos:

1. **Congresso/evento**: qual é o nome? (ex: CBTM, SBN, ABN, Movement Disorders Society, ECTRIMS...)
2. **Ano**: qual o ano do evento?
3. **Palestrante**: nome do apresentador (se souber — pode deixar em branco)
4. **Título/tema da palestra**: qual o assunto? (se souber — pode ser uma palavra-chave)
5. **Subdomínio neurológico**:
   - `neuro-movimento` (Parkinson, tremor, distonia, ataxia...)
   - `neuro-vascular` (AVC, TIA, hemorragia...)
   - `neuro-cognicao` (Alzheimer, demência, delirium...)
   - `neuro-geral` (epilepsia, cefaleia, NMJ, outro...)
   - `medicina-interna`
```

Aguarde a resposta antes de prosseguir. Use as informações para montar o prefixo dos arquivos:
```
PREFIXO = [SIGLA-CONGRESSO]-[ANO]-[TEMA-KEBAB-CASE]
Exemplo: CBTM-2025-Genetica-PD
```

---

## PASSO 1 — Extrair referências dos slides

Leia todas as imagens fornecidas pelo usuário com o tool `Read`.

Para cada slide, extraia:
- Todas as referências, citações e artigos mencionados (rodapés, slides de referência, logos de journals)
- Conceitos-chave, mecanismos, genes, drogas, critérios diagnósticos

Formate cada referência em **APA 7ª edição**. Se incompleta, marque com `[incompleto]`.

Se não houver referências explícitas, liste os conceitos-chave para pesquisa no Passo 2.

---

## PASSO 2 — Pesquisar e enriquecer referências

Use `WebSearch` para cada referência ou conceito-chave identificado.

Para cada artigo encontrado, extraia:
- **Objetivo** do estudo
- **Achados principais com números**: n amostral, effect size, p-valores, outcomes
- **Metodologia** em 1–2 frases
- **Limitações** reconhecidas
- **Informações além do slide** (contexto, desenvolvimentos posteriores, estudos relacionados)

Marque achados extras com:
```
📄 O que o material não mostrou:
```

---

## PASSO 3 — Criar notas Obsidian

**NÃO produza uma nota única monolítica.** Uma nota por conceito/gene/mecanismo/tema principal.

### Estrutura de cada nota

```markdown
---
tags: [#tipo/literatura, #fonte/congresso, #dominio/neuro, #subdominio/[AREA], #status/germinando]
data: YYYY-MM-DD
congresso: "[NOME DO CONGRESSO] [ANO]"
palestrante: "[NOME]"
---

# [Título do Tópico]
**Fonte:** [NOME DO CONGRESSO] [ANO] · [[PREFIXO-Overview]]
**Palestrante:** [NOME]

---

## [Seção Principal]

[Conteúdo extraído dos slides]

📄 **Do artigo ([Autor, Ano]):** [Achados além do slide]

📄 **O que o material não mostrou:** [Contexto adicional importante]

---

## Notas conectadas

- [[PREFIXO-Overview]] ← voltar ao índice
- [[OUTRA-NOTA-RELACIONADA]] → descrição da conexão
```

### Notas obrigatórias (criar todas)

| # | Arquivo | Conteúdo |
|---|---------|----------|
| 1 | `PREFIXO-Overview.md` | Índice: lista todas as outras notas com resumo em 1 linha, info do congresso/palestrante, tags globais |
| 2 | `PREFIXO-[Conceito].md` | Uma por conceito/gene/mecanismo principal (quantas forem necessárias) |
| 3 | `PREFIXO-Implicacoes-Clinicas.md` | Aplicação prática, red flags, diagnóstico diferencial, contexto brasileiro |
| 4 | `PREFIXO-Referencias.md` | Lista APA completa, cada referência com `[[link]]` para a nota que a usa |

### Tags do vault (usar exatamente estas)

```
#tipo/literatura
#fonte/congresso
#dominio/neuro
#subdominio/movimento   (ou vascular / cognicao / geral)
#status/germinando
```

### Regras Obsidian

- Use `[[colchetes duplos]]` em: doenças, medicamentos, genes, mecanismos, vias moleculares
- `##` seções, `###` subseções
- Tabelas Markdown para comparações
- Toda nota termina com `## Notas conectadas`
- Nomes de arquivo: sem acentos, espaços → hífens, português

---

## PASSO 4 — Flashcards Anki

Crie **25–35 cards** baseados no material dos slides + achados da pesquisa.

### Formato CSV (para importação direta no Anki)

Salve como `[PREFIXO]-Anki.csv` com o conteúdo:

```
Pergunta (Frente);Resposta (Verso)
[pergunta 1];[resposta 1]
[pergunta 2];[resposta 2]
```

**Separador: ponto e vírgula (`;`)**

### Regras dos cards

- Foco em conhecimento clinicamente relevante — sem trivialidades
- Inclua números: sensibilidade, especificidade, NNT, effect sizes, p-valores, frequências
- Um conceito por card (nunca duas perguntas em um)
- Varie os formatos: definição, mecanismo, número, diagnóstico diferencial, gene → fenótipo
- Cards de artigos pesquisados: inclua `[Fonte: Autor, Ano]` no verso

### Instrução de importação (incluir como comentário no início do CSV)

```
# Importar no Anki: Arquivo → Importar → selecionar este arquivo
# Configurar: Tipo = Básico, Separador = Ponto e vírgula, Campos = Frente/Verso
```

---

## PASSO 5 — Gravar no vault

Use o tool `Write` para gravar cada arquivo **diretamente** no vault:

**Notas Obsidian:**
```
/Users/joaofelipescheidt/Library/Mobile Documents/iCloud~md~obsidian/Documents/Joao's Mind/20-Literatura/palestras/[PREFIXO]/[PREFIXO]-Overview.md
/Users/joaofelipescheidt/Library/Mobile Documents/iCloud~md~obsidian/Documents/Joao's Mind/20-Literatura/palestras/[PREFIXO]/[PREFIXO]-[Conceito].md
...
/Users/joaofelipescheidt/Library/Mobile Documents/iCloud~md~obsidian/Documents/Joao's Mind/20-Literatura/palestras/[PREFIXO]/[PREFIXO]-Implicacoes-Clinicas.md
/Users/joaofelipescheidt/Library/Mobile Documents/iCloud~md~obsidian/Documents/Joao's Mind/20-Literatura/palestras/[PREFIXO]/[PREFIXO]-Referencias.md
```

**CSV Anki:**
```
/Users/joaofelipescheidt/Library/Mobile Documents/iCloud~md~obsidian/Documents/Joao's Mind/_flashcards-csv/[PREFIXO]-Anki.csv
```

---

## PASSO 6 — Confirmar ao usuário

Após gravar todos os arquivos, reporte:

```
✅ Notas criadas no vault Obsidian:

📁 20-Literatura/palestras/[PREFIXO]/
   • [PREFIXO]-Overview.md
   • [PREFIXO]-[Conceito1].md
   • [PREFIXO]-[Conceito2].md
   • [PREFIXO]-Implicacoes-Clinicas.md
   • [PREFIXO]-Referencias.md

🃏 Flashcards: _flashcards-csv/[PREFIXO]-Anki.csv
   ([N] cards · importar no Anki: Arquivo → Importar → separador ponto e vírgula)

Abra o Obsidian e as notas já estarão lá, interligadas.
```

---

## Checklist de qualidade (verificar antes de gravar)

- [ ] Metadados coletados do usuário (congresso, ano, palestrante, tema, subdomínio)
- [ ] Todas as imagens lidas
- [ ] Referências extraídas e formatadas APA 7ª ed.
- [ ] Cada referência pesquisada na web — achados extras marcados com 📄
- [ ] Uma nota por conceito (NÃO arquivo monolítico)
- [ ] Todo conceito relevante com `[[colchetes duplos]]`
- [ ] Toda nota tem `## Notas conectadas`
- [ ] Overview lista todas as outras notas
- [ ] Tags do vault corretas em todas as notas
- [ ] 25–35 cards Anki no CSV com separador `;`
- [ ] Todos os arquivos gravados no vault com `Write`
- [ ] Saída inteiramente em português
