# SM24 — Gerador Universal de Apostilas (Fase 1)

## O que é
Sistema que gera apostilas SM24 em PDF a partir de arquivos JSON, eliminando
a necessidade de escrever código Python por apostila. Reduz ~70% dos tokens
gastos na produção em lote.

## Conteúdo do pacote
- `build_apostila.py`     → o gerador (lê JSON, valida, produz PDF)
- `SCHEMA_APOSTILA.md`    → documentação completa do formato JSON
- `sm24-apostila/`        → biblioteca de componentes (com patch de tabelas)
- `jsons/sepse.json`      → exemplo completo e funcional

## Setup (uma vez por sessão/máquina)
```bash
pip install reportlab pypdf --break-system-packages
```

## Fluxo de trabalho (Fases 2 e 3)
1. Claude gera os arquivos .json (só conteúdo clínico, sem código) → pasta jsons/
2. Validar todos:    python3 build_apostila.py --batch jsons/ --validate-only
3. Gerar todos:      python3 build_apostila.py --batch jsons/ --outdir saida/

## Vantagens
- Validação automática antes de gerar (pega erros de tabela/fluxograma/gabarito)
- col_widths proporcional + word-wrap (tabelas nunca cortam)
- Lote: dezenas de PDFs num comando só
- JSON é ~3x mais barato em tokens que o script Python equivalente

## Próximos passos sugeridos
- Fase 2: gerar JSONs por especialidade (lotes de 15-20)
- Usar Sonnet 4.6 ou Claude Code para a Fase 2 (mais barato no padrão repetitivo)
- Reservar Opus para protocolos complexos sem fonte
