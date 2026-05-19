"""
Categorization and reconciliation of bank transactions against PainelData.
"""
import unicodedata
import difflib
from typing import List, Tuple
import pandas as pd

from data.extrato_parser import Transacao


def _normalize(text: str) -> str:
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(text).lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip()


KEYWORDS: dict = {
    "Saúde": [
        "farmacia", "drogaria", "clinica", "hospital", "unimed", "hapvida",
        "consulta", "medico", "odontol", "dentist", "optica", "laboratorio",
        "exame", "plano de saude", "saude",
    ],
    "Saúde mental": ["psicolog", "psiquiat", "terapia"],
    "Transporte": [
        "shell", "posto", "gasolina", "uber", "99app", "cabify", "estacionamento",
        "pedagio", "ipva", "licenciamento", "combustivel", "etanol", "gnv",
        "autoservice", "nissan", "financiamento veiculo",
    ],
    "Alimentação": [
        "ifood", "rappi", "mcdonalds", "burger", "pizz", "restaurante",
        "mercado", "supermercado", "padaria", "lanchonete", "bar ", "cafe ",
        "delivery", "james delivery", "hortifruti", "acougue",
    ],
    "Moradia": [
        "condominio", "copel", "sanepar", "agua ", "energia eletrica",
        "aluguel", "iptu",
    ],
    "Lazer": [
        "netflix", "spotify", "disney", "amazon prime", "hbo", "globoplay",
        "cinema", "steam", "playstation", "xbox", "apple tv", "deezer",
        "paramount", "telecine",
    ],
    "Comunicação": ["tim", "claro", "vivo", "oi ", "telefone", "internet", "banda larga"],
    "Bem-estar": ["gympass", "academia", "wellness", "pilates", "yoga", "natacao"],
    "Pet": ["petshop", "pet shop", "veterinario", "veterinaria", "racao", "cobasi"],
    "Trabalho/estudo": [
        "claude", "anthropic", "chatgpt", "openai", "notion", "adobe",
        "microsoft", "google workspace", "github", "aws", "digitalocean",
    ],
    "PJ": [
        "receita federal", "pgfn", "darf", "simples nacional", "contador",
        "contabilidade", "iss ", "cofins", "csll", "irpj",
    ],
    "Família": ["pix para mariana", "pix mariana", "transferencia mariana"],
}


def _keyword_category(desc_norm: str) -> str:
    for category, kws in KEYWORDS.items():
        for kw in kws:
            if kw in desc_norm:
                return category
    return ""


def _fuzzy_match(desc_norm: str, candidates: List[str], threshold: float = 0.55) -> Tuple[str, float]:
    """Return (best_match, score) from a list of candidate strings."""
    if not candidates:
        return "", 0.0
    best = difflib.get_close_matches(desc_norm, [_normalize(c) for c in candidates], n=1, cutoff=threshold)
    if best:
        idx = [_normalize(c) for c in candidates].index(best[0])
        ratio = difflib.SequenceMatcher(None, desc_norm, best[0]).ratio()
        return candidates[idx], ratio
    return "", 0.0


def categorize(
    transactions: List[Transacao],
    fixos_df: pd.DataFrame,
) -> List[Transacao]:
    """
    Assign categoria and match_tipo to each transaction.
    Priority: fuzzy match against fixos → keyword → empty string.
    """
    fixo_descs = list(fixos_df["Descrição"]) if not fixos_df.empty and "Descrição" in fixos_df.columns else []
    fixo_cats = dict(zip(fixos_df.get("Descrição", []), fixos_df.get("Categoria", []))) if not fixos_df.empty else {}

    for t in transactions:
        desc_norm = _normalize(t.descricao)

        # 1. Fuzzy match against known fixos
        matched_desc, score = _fuzzy_match(desc_norm, fixo_descs, threshold=0.5)
        if matched_desc and score >= 0.5:
            t.categoria = fixo_cats.get(matched_desc, "")
            t.match_tipo = "fixo"
            t.match_descricao = matched_desc
            continue

        # 2. Keyword match
        cat = _keyword_category(desc_norm)
        if cat:
            t.categoria = cat
            continue

        # 3. Unknown — will be shown as pontual candidate for debits
        t.categoria = ""

    return transactions


def reconcile_revenues(
    transactions: List[Transacao],
    revenues_df: pd.DataFrame,
    tolerance: float = 0.05,
) -> List[Transacao]:
    """
    For credit transactions, try to match against revenues by amount (±tolerance%).
    Marks matching transactions with match_tipo="receita".
    """
    if revenues_df.empty or "Previsto" not in revenues_df.columns:
        return transactions

    rev_values = []
    for _, row in revenues_df.iterrows():
        try:
            v = float(row["Previsto"])
            if v > 0:
                rev_values.append((v, str(row.get("Descrição", ""))))
        except (ValueError, TypeError):
            pass

    for t in transactions:
        if t.tipo != "credito" or t.match_tipo:
            continue
        amount = abs(t.valor)
        for expected, desc in rev_values:
            if expected == 0:
                continue
            delta = abs(amount - expected) / expected
            if delta <= tolerance:
                t.match_tipo = "receita"
                t.match_descricao = desc
                t.categoria = "Receita PJ"
                break

    return transactions


def flag_pontuais(transactions: List[Transacao]) -> List[Transacao]:
    """
    Mark debit transactions with no match as pontual_candidato.
    """
    for t in transactions:
        if t.tipo == "debito" and not t.match_tipo:
            t.match_tipo = "pontual_candidato"
    return transactions


def run_all(
    transactions: List[Transacao],
    fixos_df: pd.DataFrame,
    revenues_df: pd.DataFrame,
) -> List[Transacao]:
    """Run full pipeline: categorize → reconcile → flag pontuais."""
    transactions = categorize(transactions, fixos_df)
    transactions = reconcile_revenues(transactions, revenues_df)
    transactions = flag_pontuais(transactions)
    return transactions


def summary_stats(transactions: List[Transacao]) -> dict:
    creditos = sum(t.valor for t in transactions if t.tipo == "credito")
    debitos = sum(abs(t.valor) for t in transactions if t.tipo == "debito")
    n_receitas = sum(1 for t in transactions if t.match_tipo == "receita")
    n_fixos = sum(1 for t in transactions if t.match_tipo == "fixo")
    n_pontuais = sum(1 for t in transactions if t.match_tipo == "pontual_candidato")
    return {
        "total_creditos": creditos,
        "total_debitos": debitos,
        "saldo": creditos - debitos,
        "n_total": len(transactions),
        "n_receitas_confirmadas": n_receitas,
        "n_fixos_identificados": n_fixos,
        "n_pontuais_candidatos": n_pontuais,
    }


# All available categories for the dropdown in the UI
ALL_CATEGORIES = sorted(list(KEYWORDS.keys()) + ["Alimentação", "Receita PJ", "Outros", ""])
