"""SM24 Apostila — biblioteca de componentes."""

from .flowables import (
    THEME,
    ChapterBar, SectionTitle,
    InfoBox, HighlightBox, RxBox, CheckList,
    TwoCols,
    ComparisonTable,
    FlowChart,
    QuestionBox, AnswerBox,
)
from .builder import make_doc, block, sp

__all__ = [
    "THEME",
    "ChapterBar", "SectionTitle",
    "InfoBox", "HighlightBox", "RxBox", "CheckList",
    "TwoCols",
    "ComparisonTable",
    "FlowChart",
    "QuestionBox", "AnswerBox",
    "make_doc", "block", "sp",
]
