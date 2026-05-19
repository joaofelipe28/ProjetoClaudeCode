"""
PDF bank statement parser for C6, Santander, Inter, and generic Brazilian banks.
Returns a list of Transacao dataclasses.
"""
import re
import io
import unicodedata
from dataclasses import dataclass, field
from typing import List, Optional

import pdfplumber


@dataclass
class Transacao:
    data: str               # "15/05/2026"
    descricao: str          # original description from statement
    valor: float            # positive = credit, negative = debit
    tipo: str               # "debito" | "credito"
    banco: str              # "C6" | "Santander" | "Inter" | "Desconhecido"
    categoria: str = ""     # auto-classified or user-edited
    match_tipo: str = ""    # "fixo" | "parcela" | "receita" | "pontual_candidato" | ""
    match_descricao: str = ""  # what it matched against


def _normalize(text: str) -> str:
    """Lowercase, remove accents, collapse spaces."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip()


def _parse_value(raw: str) -> Optional[float]:
    """Parse Brazilian currency string to float. Returns None if unparseable."""
    if not raw:
        return None
    cleaned = re.sub(r"[R$\s]", "", str(raw)).replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def _detect_bank(text: str) -> str:
    t = text.upper()
    if "C6 BANK" in t or "BANCO C6" in t or "C6 S.A" in t:
        return "C6"
    if "SANTANDER" in t:
        return "Santander"
    if "BANCO INTER" in t or "INTER S.A" in t or "INTER DTVM" in t:
        return "Inter"
    if "NUBANK" in t or "NU BANK" in t or "NU PAGAMENTOS" in t:
        return "Nubank"
    if "BRADESCO" in t:
        return "Bradesco"
    if "ITAU" in t or "ITAÚ" in t:
        return "Itaú"
    return "Desconhecido"


def _normalize_date(raw: str) -> str:
    """Normalize date string to DD/MM/YYYY. Returns raw if can't parse."""
    raw = raw.strip()
    # Already DD/MM/YYYY
    if re.match(r"\d{2}/\d{2}/\d{4}$", raw):
        return raw
    # DD/MM/YY
    m = re.match(r"(\d{2})/(\d{2})/(\d{2})$", raw)
    if m:
        d, mo, y = m.groups()
        year = f"20{y}" if int(y) < 50 else f"19{y}"
        return f"{d}/{mo}/{year}"
    # DD/MM — append current year context
    m = re.match(r"(\d{2})/(\d{2})$", raw)
    if m:
        return f"{raw}/2026"
    # YYYY-MM-DD
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})$", raw)
    if m:
        y, mo, d = m.groups()
        return f"{d}/{mo}/{y}"
    return raw


# ── Generic table/text extractor ───────────────────────────────────────────

_DATE_RE = re.compile(r"\b(\d{2}[/\-]\d{2}(?:[/\-]\d{2,4})?)\b")
_VALUE_RE = re.compile(r"([-+]?\s*R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})")


def _parse_generic_text(text: str, banco: str) -> List[Transacao]:
    """
    Fallback parser: scan each line looking for date + description + value patterns.
    Works for most Brazilian bank statements where each transaction is one line.
    """
    transactions = []
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    for line in lines:
        date_m = _DATE_RE.search(line)
        if not date_m:
            continue
        val_matches = _VALUE_RE.findall(line)
        if not val_matches:
            continue

        raw_date = date_m.group(1)
        raw_val = val_matches[-1]  # last monetary value in the line
        val = _parse_value(raw_val)
        if val is None:
            continue

        # Description: everything between date and value
        date_end = date_m.end()
        val_start = line.rfind(val_matches[-1])
        desc = line[date_end:val_start].strip(" -|:") if val_start > date_end else line[date_end:].strip()
        if not desc or len(desc) < 3:
            continue

        tipo = "credito" if val > 0 else "debito"
        transactions.append(Transacao(
            data=_normalize_date(raw_date),
            descricao=desc,
            valor=val,
            tipo=tipo,
            banco=banco,
        ))

    return transactions


def _parse_table_rows(rows: List[List], banco: str) -> List[Transacao]:
    """
    Parse a list of rows (from pdfplumber extract_tables) into Transacao objects.
    Tries to auto-detect which columns are date / description / value.
    """
    if not rows or len(rows) < 2:
        return []

    # Find header row — first row with non-None values
    header_idx = 0
    for i, row in enumerate(rows):
        if any(c for c in row if c):
            header_idx = i
            break

    header = [_normalize(str(c or "")) for c in rows[header_idx]]

    # Try to identify columns
    date_col = _find_col(header, ["data", "date", "dt", "dia"])
    desc_col = _find_col(header, ["descricao", "descr", "historico", "lancamento", "estabelecimento", "titulo"])
    val_col = _find_col(header, ["valor", "value", "total", "quantia", "montante"])
    debit_col = _find_col(header, ["debito", "saida", "saidas", "debit"])
    credit_col = _find_col(header, ["credito", "entrada", "entradas", "credit"])

    # Fallback: guess by position (common: date=0, desc=1, val=-1)
    if date_col is None:
        date_col = 0
    if desc_col is None:
        desc_col = 1
    if val_col is None and debit_col is None and credit_col is None:
        val_col = len(header) - 1

    transactions = []
    for row in rows[header_idx + 1:]:
        if not row or not any(row):
            continue
        cells = [str(c or "").strip() for c in row]
        if len(cells) <= max(filter(None, [date_col, desc_col, val_col, debit_col, credit_col]) or [0]):
            continue

        raw_date = cells[date_col] if date_col is not None and date_col < len(cells) else ""
        if not _DATE_RE.search(raw_date):
            continue

        desc = cells[desc_col] if desc_col is not None and desc_col < len(cells) else ""
        if not desc or len(desc) < 2:
            continue

        # Determine value and type
        valor = None
        tipo = "debito"

        if debit_col is not None and credit_col is not None:
            dv = _parse_value(cells[debit_col]) if debit_col < len(cells) else None
            cv = _parse_value(cells[credit_col]) if credit_col < len(cells) else None
            if dv and dv != 0:
                valor, tipo = -abs(dv), "debito"
            elif cv and cv != 0:
                valor, tipo = abs(cv), "credito"
        elif val_col is not None and val_col < len(cells):
            valor = _parse_value(cells[val_col])
            if valor is not None:
                tipo = "credito" if valor > 0 else "debito"

        if valor is None:
            continue

        transactions.append(Transacao(
            data=_normalize_date(raw_date),
            descricao=desc,
            valor=valor,
            tipo=tipo,
            banco=banco,
        ))

    return transactions


def _find_col(header: List[str], keywords: List[str]) -> Optional[int]:
    for kw in keywords:
        for i, h in enumerate(header):
            if kw in h:
                return i
    return None


# ── Bank-specific pre-processing ────────────────────────────────────────────

def _preprocess_c6(text: str) -> str:
    """C6 sometimes groups lines — no special preprocessing needed currently."""
    return text


def _preprocess_santander(text: str) -> str:
    """Santander statements may have multi-line descriptions; collapse them."""
    # Remove lines that are just page numbers or headers
    lines = text.splitlines()
    cleaned = []
    for line in lines:
        stripped = line.strip()
        if re.match(r"^P[aá]gina \d+", stripped, re.IGNORECASE):
            continue
        if re.match(r"^(Extrato|Saldo|Banco Santander)", stripped, re.IGNORECASE):
            continue
        cleaned.append(line)
    return "\n".join(cleaned)


def _preprocess_inter(text: str) -> str:
    return text


# ── Public API ───────────────────────────────────────────────────────────────

def parse_pdf(file_bytes: bytes) -> List[Transacao]:
    """
    Parse a bank statement PDF and return a list of Transacao.
    Auto-detects bank from content.
    """
    transactions: List[Transacao] = []

    try:
        pdf = pdfplumber.open(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Não foi possível abrir o PDF: {e}")

    # Extract full text for bank detection
    full_text = ""
    for page in pdf.pages:
        t = page.extract_text() or ""
        full_text += t + "\n"

    banco = _detect_bank(full_text)

    # Apply bank-specific text preprocessing
    if banco == "Santander":
        full_text = _preprocess_santander(full_text)
    elif banco == "C6":
        full_text = _preprocess_c6(full_text)
    elif banco == "Inter":
        full_text = _preprocess_inter(full_text)

    # Try table extraction first (most reliable)
    all_rows = []
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table and len(table) > 1:
                all_rows.extend(table)

    if all_rows:
        transactions = _parse_table_rows(all_rows, banco)

    # If table extraction yielded few results, try text
    if len(transactions) < 2:
        transactions = _parse_generic_text(full_text, banco)

    pdf.close()

    # Deduplicate by (data, descricao, valor)
    seen = set()
    unique = []
    for t in transactions:
        key = (t.data, _normalize(t.descricao)[:40], round(t.valor, 2))
        if key not in seen:
            seen.add(key)
            unique.append(t)

    return unique


def detect_bank_from_bytes(file_bytes: bytes) -> str:
    """Quick bank detection without full parse."""
    try:
        pdf = pdfplumber.open(io.BytesIO(file_bytes))
        text = ""
        for page in pdf.pages[:2]:
            text += page.extract_text() or ""
        pdf.close()
        return _detect_bank(text)
    except Exception:
        return "Desconhecido"
