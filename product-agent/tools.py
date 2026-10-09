"""Tools the product-knowledge agent can call.

Retrieval is plain keyword ranking (BM25) over the sections of product-docs/*.md.
No embeddings and no vector database, so it runs offline. In a real team,
swap search_docs for your vector store, Confluence, or Jira behind the same
tool name, and the agent does not change.
"""
import json
import math
import re
from collections import Counter
from pathlib import Path

from claude_agent_sdk import create_sdk_mcp_server, tool

DOCS = Path(__file__).resolve().parents[1] / "product-docs"

STOPWORDS = set(
    "a an and are as at be by can do does for from has have how i if in is it its of on or "
    "the their there this to was what when where which who why will with you your".split()
)


def _tokens(text: str) -> list[str]:
    return [word for word in re.findall(r"[a-z0-9]+", text.lower()) if word not in STOPWORDS]


def _sections() -> list[dict]:
    """Split every doc into its ## sections. Each section is one searchable chunk."""
    chunks = []
    for path in sorted(DOCS.glob("*.md")):
        title, heading, lines = path.stem, "Overview", []
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.startswith("# "):
                title = line[2:].strip()
            elif line.startswith("## "):
                if lines:
                    chunks.append({"doc": path.name, "title": title, "section": heading, "text": "\n".join(lines).strip()})
                heading, lines = line[3:].strip(), []
            else:
                lines.append(line)
        if lines:
            chunks.append({"doc": path.name, "title": title, "section": heading, "text": "\n".join(lines).strip()})
    return [chunk for chunk in chunks if chunk["text"]]


# ---------- plain functions (the real logic) ----------

def list_docs() -> dict:
    """Every product doc and its section headings."""
    docs: dict[str, list[str]] = {}
    for chunk in _sections():
        docs.setdefault(chunk["doc"], []).append(chunk["section"])
    return {"docs": [{"doc": name, "sections": sections} for name, sections in docs.items()]}


def search_docs(query: str, limit: int = 3) -> dict:
    """The best-matching doc sections for a question, with a citation for each."""
    chunks = _sections()
    tokenized = [_tokens(f"{chunk['section']} {chunk['text']}") for chunk in chunks]
    average = sum(len(words) for words in tokenized) / max(1, len(tokenized))
    frequency = Counter(word for words in tokenized for word in set(words))
    terms = _tokens(query)
    k1, b = 1.5, 0.75

    scored = []
    for chunk, words in zip(chunks, tokenized):
        counts = Counter(words)
        score = 0.0
        for term in terms:
            if term not in counts:
                continue
            idf = math.log(1 + (len(chunks) - frequency[term] + 0.5) / (frequency[term] + 0.5))
            tf = counts[term]
            score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * len(words) / average))
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda item: item[0], reverse=True)
    return {
        "query": query,
        "results": [
            {"source": f"{chunk['doc']}#{chunk['section']}", "score": round(score, 2), "text": chunk["text"]}
            for score, chunk in scored[:limit]
        ],
    }


def read_doc(doc: str) -> dict:
    """The full text of one product doc, by file name."""
    path = (DOCS / Path(doc).name)
    if path.suffix != ".md" or not path.exists():
        return {"error": f"No product doc named {doc}. Use list_docs to see what exists."}
    return {"doc": path.name, "text": path.read_text(encoding="utf-8")}


# ---------- Agent SDK wrappers ----------

def _as_text(result: dict) -> dict:
    return {"content": [{"type": "text", "text": json.dumps(result, indent=2)}]}


@tool("search_docs", "Search the TravelDesk product docs. Returns the best-matching sections, each with a source to cite.", {"query": str})
async def search_docs_tool(args):
    return _as_text(search_docs(args["query"]))


@tool("read_doc", "Read one whole product doc by file name, e.g. sign-in.md, when a search result is not enough.", {"doc": str})
async def read_doc_tool(args):
    return _as_text(read_doc(args["doc"]))


@tool("list_docs", "List every product doc and its sections.", {})
async def list_docs_tool(args):
    return _as_text(list_docs())


SERVER_NAME = "product"
TOOL_NAMES = ["search_docs", "read_doc", "list_docs"]

product_server = create_sdk_mcp_server(
    name=SERVER_NAME,
    version="1.0.0",
    tools=[search_docs_tool, read_doc_tool, list_docs_tool],
)

ALLOWED_TOOLS = [f"mcp__{SERVER_NAME}__{name}" for name in TOOL_NAMES]
