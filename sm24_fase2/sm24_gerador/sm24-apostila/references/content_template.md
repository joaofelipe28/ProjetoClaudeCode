# Estrutura Padrão de Capítulo

Embora a estrutura possa variar conforme o tema, a **maioria dos protocolos clínicos da SM24 segue o padrão abaixo**. Use como ponto de partida e adapte conforme a doença/condição:

## Estrutura completa (ordem sugerida)

1. **Título do capítulo** (`ChapterBar`)
2. **Visão geral / Fluxograma de conduta** (`FlowChart`)
3. **Anamnese direcionada** (`InfoBox` com mnemônico)
4. **Perguntas-chave ao paciente** (`HighlightBox` roxo)
5. **Exame físico essencial** (`InfoBox` verde)
6. **Sinais de alerta / Red Flags** (`HighlightBox` vermelho)
7. **Conduta imediata se red flag presente** (`HighlightBox` laranja)
8. **Classificação** (`TwoCols` ou tabela)
9. **Tabela comparativa** entre subtipos (`ComparisonTable`)
10. **Para cada subtipo:** características clínicas + tratamento (`TwoCols`) + receita (`RxBox`)
11. **Profilaxia / cuidados crônicos** (se aplicável)
12. **Quando pedir exames** (`InfoBox` + `TwoCols`)
13. **Critérios de internação** (`HighlightBox` vermelho)
14. **Checklist de alta** (`CheckList` verde)
15. **Modelos de receita para alta** (`RxBox` x 3)
16. **Passagem de caso para SAMU/transferência** (`HighlightBox` laranja)
17. **PageBreak**
18. **Questões de residência** (`ChapterBar` + 3-5 `QuestionBox`)
19. **Gabarito comentado** (`AnswerBox` x N)

---

## Adaptações por tipo de tema

### Para urgências/emergências (AVC, IAM, sepse, anafilaxia)
- **Inverta a ordem:** comece com fluxograma e ABCDE, depois anamnese.
- Inclua **time-to-treatment** com destaque (ex: "porta-agulha < 60 min").
- Use mais `HighlightBox` laranja para condutas com janela de tempo.

### Para condições crônicas (HAS, DM, dislipidemia)
- Anamnese pode ser breve.
- Foque em **classificação** + **metas terapêuticas** + **escolha de droga por perfil**.
- Use mais tabelas comparativas (drogas, perfis, contraindicações).
- Diminua peso de "red flags", aumente peso de "seguimento ambulatorial".

### Para psiquiatria/comportamento (depressão, ansiedade, suicídio)
- **Triagem de risco** vai logo após anamnese (use `HighlightBox` vermelho).
- Inclua **escalas validadas** (PHQ-9, GAD-7) como `InfoBox`.
- Modelos de receita são mais simples — use `RxBox` único.

### Para procedimentos (intubação, drenagem, sutura)
- Substitua "anamnese" por **indicações e contraindicações**.
- **Material necessário** vira `CheckList` no início.
- **Passo-a-passo** do procedimento usa `InfoBox` numerado.
- **Complicações e como manejar** usa `HighlightBox` laranja/vermelho.

### Para infectologia (meningite, pneumonia, ITU)
- Anamnese padrão, mas inclua **fatores de risco epidemiológicos**.
- **Antibioticoterapia empírica** por contexto/idade vai em `ComparisonTable`.
- **Quando considerar resistência** em `HighlightBox` laranja.

### Para neurologia (cefaleia, vertigem, convulsão, AVC)
- Padrão completo se aplica bem.
- Exame neurológico sistemático em `InfoBox` verde detalhado.
- Use `FlowChart` para diferenciar tipos (ex: AVC isq vs hemorrágico).

---

## Convenções de cor por seção

Mantenha consistência através dos capítulos:

| Seção | Cor do título | Tipo de caixa |
|-------|--------------|---------------|
| Visão geral / Fluxograma | `teal` | `FlowChart` |
| Anamnese | `teal` | `InfoBox` teal |
| Perguntas-chave | `teal` | `HighlightBox` purple |
| Exame físico | `green` | `InfoBox` green |
| Red flags | `red` | `HighlightBox` red |
| Conduta de alarme | `red` | `HighlightBox` orange |
| Classificação | `teal` | `TwoCols` (teal × red) |
| Diagnóstico A | `purple` | mistas |
| Diagnóstico B | `blue` | mistas |
| Diagnóstico C | `orange` | mistas |
| Tratamento | varia | `HighlightBox` teal |
| Prescrição | (sem título) | `RxBox` |
| Profilaxia | `purple` | `HighlightBox` purple |
| Critérios de internação | `red` | `HighlightBox` red |
| Checklist de alta | `green` | `CheckList` |
| Passagem SAMU | `orange` | `HighlightBox` orange |
| Questões | `navy` | `ChapterBar` + `QuestionBox` |
| Gabarito | `green` | `AnswerBox` |

---

## Boas práticas de conteúdo

### Densidade
- **Limite de 4 páginas** por capítulo + 1 página de questões. Se ultrapassar, divida em capítulos menores.
- **Bullets curtos:** uma ideia por linha, idealmente <100 caracteres.
- **Evite parágrafos longos** dentro de caixas — quebre em vários itens.

### Tom
- **Direto e prescritivo** (estilo manual de plantão), não acadêmico.
- Use **dose, via, frequência** explícitas em todos os medicamentos.
- Evite "considerar X" se a conduta é clara — escreva "iniciar X" ou "fazer X".
- Para condutas opcionais: "OU" em maiúsculas entre alternativas.

### Questões de residência
- **3-5 questões** por capítulo, das mais frequentes em concursos.
- Identifique a **fonte** ("USP-SP / Adaptada", "UNIFESP / Adaptada").
- **Comentário do gabarito** deve explicar:
  - Por que a alternativa correta é correta
  - Por que pelo menos 1-2 distratoras são erradas
  - O conceito-chave que a questão testa
- Comente em 2-3 frases, sem ser longo demais.

### Imagens / Diagramas
- Use `FlowChart` para fluxos de decisão clínica.
- Use `ComparisonTable` para 2-4 entidades com várias características.
- Quando precisar de uma ilustração específica (ex: anatomia, ECG, TC), peça ao Claude para desenhar com primitivas vetoriais (já existe exemplo de "cabeças com zonas de dor" no projeto cefaleia).
- **Nunca tente** importar imagens externas sem autorização — sempre confirme licença/uso.
