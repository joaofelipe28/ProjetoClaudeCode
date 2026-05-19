import os

XLSX_PATH = os.environ.get(
    "PAINEL_XLSX_PATH",
    "/Users/joaofelipescheidt/Downloads/Painel Financeiro João Felipe.xlsx",
)

# Fallback for testing in sandboxed environments
if not os.path.exists(XLSX_PATH):
    _fallback = "/tmp/painel.xlsx"
    if os.path.exists(_fallback):
        XLSX_PATH = _fallback

MONTHS = ["Mai2026", "Jun2026", "Jul2026", "Ago2026", "Set2026", "Out2026", "Nov2026", "Dez2026"]
MONTH_LABELS = ["Mai/26", "Jun/26", "Jul/26", "Ago/26", "Set/26", "Out/26", "Nov/26", "Dez/26"]
MONTH_MAP = dict(zip(MONTHS, MONTH_LABELS))

COLORS = {
    "receita": "#2ecc71",
    "fixos": "#e74c3c",
    "parcelas": "#e67e22",
    "darf": "#9b59b6",
    "pj_parcelas": "#3498db",
    "pontuais": "#f39c12",
    "saldo": "#1abc9c",
    "alerta": "#f1c40f",
    "verde": "#1e6f50",
}

EXPENSE_COLORS = [
    COLORS["fixos"],
    COLORS["parcelas"],
    COLORS["darf"],
    COLORS["pontuais"],
    COLORS["pj_parcelas"],
]
