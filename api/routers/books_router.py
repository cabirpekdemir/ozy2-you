"""OZY2 — Book Tracker Router"""
import json
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/books", tags=["Books"])

DB_FILE = Path.home() / ".ozy2" / "books.json"
DB_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load() -> list:
    if DB_FILE.exists():
        return json.loads(DB_FILE.read_text())
    return []


def _save(books: list):
    DB_FILE.write_text(json.dumps(books, indent=2, ensure_ascii=False))


# ── Models ────────────────────────────────────────────────────────────────────

class AddBookRequest(BaseModel):
    title:       str
    author:      str = ""
    status:      str = "reading"   # reading | want_to_read | completed
    total_pages: int = 0
    cover_url:   str = ""

class UpdateProgressRequest(BaseModel):
    current_page: Optional[int] = None
    status:       Optional[str] = None
    rating:       Optional[int] = None   # 1-5

class AddNoteRequest(BaseModel):
    text: str
    page: int  = 0
    type: str  = "note"   # note | quote | highlight


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/")
async def list_books(status: str = "all"):
    books = _load()
    if status != "all":
        books = [b for b in books if b.get("status") == status]
    for b in books:
        if b.get("total_pages") and b.get("current_page"):
            b["progress_pct"] = int(b["current_page"] / b["total_pages"] * 100)
        else:
            b["progress_pct"] = 0
    stats = {
        "total":        len(_load()),
        "reading":      sum(1 for b in _load() if b.get("status") == "reading"),
        "completed":    sum(1 for b in _load() if b.get("status") == "completed"),
        "want_to_read": sum(1 for b in _load() if b.get("status") == "want_to_read"),
    }
    return {"ok": True, "books": books, "stats": stats}


@router.post("/")
async def add_book(req: AddBookRequest):
    books = _load()
    if any(b["title"].lower() == req.title.lower() for b in books):
        return {"ok": False, "error": f"'{req.title}' is already in your library"}
    book = {
        "id":           len(books) + 1,
        "title":        req.title,
        "author":       req.author,
        "status":       req.status,
        "total_pages":  req.total_pages,
        "current_page": 0,
        "cover_url":    req.cover_url,
        "added":        datetime.now().strftime("%Y-%m-%d"),
        "finished":     "",
        "rating":       0,
        "notes":        [],
    }
    books.append(book)
    _save(books)
    return {"ok": True, "book": book}


@router.put("/{book_id}/progress")
async def update_progress(book_id: int, req: UpdateProgressRequest):
    books = _load()
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        return {"ok": False, "error": "Book not found"}
    if req.current_page is not None:
        book["current_page"] = req.current_page
    if req.status:
        book["status"] = req.status
        if req.status == "completed" and not book.get("finished"):
            book["finished"] = datetime.now().strftime("%Y-%m-%d")
    if req.rating:
        book["rating"] = max(1, min(5, req.rating))
    _save(books)
    progress_pct = 0
    if book.get("total_pages") and book.get("current_page"):
        progress_pct = int(book["current_page"] / book["total_pages"] * 100)
    return {"ok": True, "book": book, "progress_pct": progress_pct}


@router.post("/{book_id}/notes")
async def add_note(book_id: int, req: AddNoteRequest):
    books = _load()
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        return {"ok": False, "error": "Book not found"}
    note = {
        "type": req.type,
        "text": req.text,
        "page": req.page,
        "date": datetime.now().strftime("%Y-%m-%d"),
    }
    book.setdefault("notes", []).append(note)
    _save(books)
    return {"ok": True, "note": note, "book": book["title"]}


@router.delete("/{book_id}/notes/{note_index}")
async def delete_note(book_id: int, note_index: int):
    books = _load()
    book = next((b for b in books if b["id"] == book_id), None)
    if not book:
        return {"ok": False, "error": "Book not found"}
    notes = book.get("notes", [])
    if note_index < 0 or note_index >= len(notes):
        return {"ok": False, "error": "Note not found"}
    notes.pop(note_index)
    _save(books)
    return {"ok": True}


@router.delete("/{book_id}")
async def delete_book(book_id: int):
    books = [b for b in _load() if b["id"] != book_id]
    _save(books)
    return {"ok": True}


@router.get("/search")
async def search_open_library(q: str):
    """Search Open Library for book metadata (cover, page count, author)."""
    import urllib.request, urllib.parse
    try:
        url = f"https://openlibrary.org/search.json?q={urllib.parse.quote(q)}&limit=5&fields=title,author_name,number_of_pages_median,cover_i"
        with urllib.request.urlopen(url, timeout=10) as r:
            data = json.loads(r.read())
        results = []
        for doc in data.get("docs", []):
            cover_id = doc.get("cover_i")
            results.append({
                "title":       doc.get("title", ""),
                "author":      ", ".join(doc.get("author_name", [])),
                "pages":       doc.get("number_of_pages_median", 0),
                "cover_url":   f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else "",
            })
        return {"ok": True, "results": results}
    except Exception as e:
        return {"ok": False, "error": str(e), "results": []}
