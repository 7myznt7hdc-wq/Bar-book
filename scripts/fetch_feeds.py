#!/usr/bin/env python3
"""Fetch curated public RSS/Atom and YouTube channel feeds into data/trends.json and data/news.json.

No API keys. One failing feed does not fail the run. Existing items from a failed feed are
kept if they are still inside the 60-day window. Stdlib only.
"""
from __future__ import annotations

import email.utils
import html
import json
import re
import ssl
import sys
import unicodedata
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from hashlib import sha1
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
DAYS = 60
CAP_TRENDS = 50
CAP_NEWS = 100
UA = "BarBook/1.0 (feed fetcher; https://github.com/7myznt7hdc-wq/Bar-book)"
TIMEOUT = 20
CTX = ssl.create_default_context()

TOPIC_RX = {
    "openings": re.compile(
        r"\b((?:grand |new )?opening(?: night| soon)?|nears opening|to open|opens(?: its| a| the| in| its doors)|opened|new bars?|debuts?|debuted|launches a|launched)\b",
        re.I,
    ),
    "awards": re.compile(
        r"\b(awards?|awarded|50 best|world'?s best|ranked|ranking|winners?|wins\b|accolades?|prize)\b",
        re.I,
    ),
    "menus": re.compile(
        r"\b(menus?|cocktail list|new drinks?|seasonal menu|signature cocktails?|new cocktail)\b",
        re.I,
    ),
    "guest shifts": re.compile(
        r"\b(guest shift|guest bartend(?:er|ing)?|takeover|pop-?up|residency|visiting bartender)\b",
        re.I,
    ),
    "techniques": re.compile(
        r"\b(techniques?|how to(?: shake| stir| muddle)|fat-?wash(?:ing)?|oleo saccharum|infusions?|clarified punch)\b",
        re.I,
    ),
}
# Media articles must be about drinks/bars; drops general lifestyle from broad feeds such as VinePair.
DRINKS_RX = re.compile(
    r"\b(bars?|cocktails?|bartenders?|bartending|speakeasy|spirits?|whisky|whiskey|gin|rum|tequila|mezcal|vodka|"
    r"wine|wines|beer|aperitif|aperitivo|vermouth|liqueur|distill(?:ed|ery|ation)?|pubs?|drinks?|drinking|"
    r"negroni|martini|highball|50 best|mixology|sommelier|agave|sherry|cognac|champagne|sake)\b",
    re.I,
)
SKIP_TITLE = re.compile(r"^thank you to our partners\b", re.I)
CAP_PER_SOURCE = 15

# Single-word or common names that need the city or "bar" next to them.
SHORT = {
    "line",
    "zest",
    "argo",
    "waltz",
    "montana",
    "virtu",
    "angelita",
    "schmuck",
    "gokan",
    "sips",
    "paradiso",
    "danico",
    "locale",
    "hope",
    "tan tan",
    "eximia",
    "mirror bar",
    "snack",
}

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def parse_date(s: str | None) -> datetime | None:
    if not s:
        return None
    s = s.strip()
    try:
        d = email.utils.parsedate_to_datetime(s)
        if d is not None:
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        pass
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        d = datetime.fromisoformat(s)
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def iso(d: datetime) -> str:
    return d.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def loc(tag: str) -> str:
    return tag.split("}", 1)[-1].lower()


def text_of(el: ET.Element | None) -> str:
    if el is None:
        return ""
    parts = [el.text or ""]
    for c in el:
        parts.append(text_of(c))
        parts.append(c.tail or "")
    return "".join(parts)


def child(el: ET.Element, *names: str) -> ET.Element | None:
    want = {n.lower() for n in names}
    for c in el:
        if loc(c.tag) in want:
            return c
    return None


def children(el: ET.Element, *names: str):
    want = {n.lower() for n in names}
    return [c for c in el if loc(c.tag) in want]


def attr(el: ET.Element, *names: str) -> str:
    low = {k.lower(): v for k, v in el.attrib.items()}
    # also strip namespaces from attr keys
    for k, v in el.attrib.items():
        low[loc(k).lower()] = v
    for n in names:
        if n.lower() in low:
            return low[n.lower()]
    return ""


def strip_html(s: str) -> str:
    if not s:
        return ""
    s = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", s)
    s = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", s)
    s = re.sub(r"(?is)<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def excerpt(s: str, n: int = 200) -> str:
    s = strip_html(s)
    s = re.sub(r"(?i)\s*The post\b.*$", "", s).strip()
    if not s:
        return ""
    if len(s) <= n:
        return s
    cut = s[:n]
    i = cut.rfind(" ")
    if i > 120:
        cut = cut[:i]
    return cut.rstrip(" ,;:.-") + "…"


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace("&", " and ").lower()
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " " + s + " "


def load_bars():
    d = json.loads((DATA / "bars.json").read_text())
    return d["bars"]


def match_bars(text: str, bars, preset: str | None = None) -> list[str]:
    found: list[str] = []
    if preset:
        found.append(preset)
    blob = norm(text)
    for b in bars:
        name = b["name"]
        if name in found:
            continue
        nn = norm(name)
        key = nn.strip()
        city = norm(b.get("city") or "")
        if key in SHORT or len(key) <= 5:
            hits = (
                (nn + city.strip() + " ") in blob
                or (city + key + " ") in blob
                or (" bar " + key + " ") in blob
                or (" " + key + " bar ") in blob
                or (nn.strip() + " " + city.strip()) in blob
            )
            if hits:
                found.append(name)
        else:
            if nn in blob:
                found.append(name)
    return found


def topics_of(text: str) -> list[str]:
    return [k for k, rx in TOPIC_RX.items() if rx.search(text or "")]


def decode_xml(body: bytes) -> ET.Element:
    head = body[:200]
    m = re.search(br"encoding=['\"]([^'\"]+)['\"]", head, re.I)
    enc = (m.group(1).decode("ascii", "ignore").lower() if m else "utf-8") or "utf-8"
    if enc in ("utf-8", "utf8"):
        text = body.decode("utf-8", "replace")
    else:
        try:
            text = body.decode(enc, "replace")
        except LookupError:
            text = body.decode("utf-8", "replace")
    text = re.sub(r"encoding=['\"][^'\"]+['\"]", 'encoding="UTF-8"', text, count=1)
    def _ent(m):
        ent = m.group(0)
        if re.match(r"&(#\d+|#x[0-9a-fA-F]+|amp|lt|gt|quot|apos);", ent, re.I):
            return ent
        ch = html.unescape(ent)
        return ch if ch != ent else " "
    text = re.sub(r"&[#a-zA-Z0-9]+;", _ent, text)
    return ET.fromstring(text.encode("utf-8"))


def fetch(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT, context=CTX) as r:
        return r.read()


def iter_entries(root: ET.Element):
    if loc(root.tag) == "feed":
        for e in children(root, "entry"):
            yield e
        return
    channel = child(root, "channel"); channel = channel if channel is not None else root
    for e in children(channel, "item"):
        yield e


def entry_link(e: ET.Element) -> str:
    # rss <link>text</link> or atom <link href>
    for c in children(e, "link"):
        href = attr(c, "href")
        rel = (attr(c, "rel") or "alternate").lower()
        if href and rel in ("alternate", ""):
            return href.strip()
        if href and not attr(c, "rel"):
            return href.strip()
        t = text_of(c).strip()
        if t.startswith("http"):
            return t
    for c in children(e, "link"):
        href = attr(c, "href")
        if href:
            return href.strip()
    guid = child(e, "guid", "id")
    t = text_of(guid).strip()
    if t.startswith("http"):
        return t
    # youtube video id
    vid = text_of(child(e, "videoid"))
    if vid:
        return "https://www.youtube.com/watch?v=" + vid.strip()
    return ""


def entry_thumb(e: ET.Element) -> str:
    for c in children(e, "thumbnail", "content"):
        url = attr(c, "url")
        typ = attr(c, "type", "medium")
        if url and (loc(c.tag) == "thumbnail" or typ.startswith("image") or re.search(r"\.(jpe?g|png|webp|gif)(\?|$)", url, re.I)):
            return url
    # media:group
    for g in children(e, "group"):
        t = entry_thumb(g)
        if t:
            return t
    for c in children(e, "enclosure"):
        typ = attr(c, "type")
        url = attr(c, "url")
        if url and typ.startswith("image"):
            return url
    return ""


def entry_summary(e: ET.Element) -> str:
    # do not use content:encoded (full article)
    for name in ("description", "summary"):
        t = text_of(child(e, name))
        if t.strip():
            return t
    # media:description, maybe nested in group
    for c in e.iter():
        if loc(c.tag) == "description" and c is not child(e, "description"):
            t = text_of(c)
            if t.strip():
                return t
    return ""


def entry_title(e: ET.Element) -> str:
    return strip_html(text_of(child(e, "title")))


def entry_date(e: ET.Element) -> datetime | None:
    for name in ("published", "pubdate", "updated", "date"):
        d = parse_date(text_of(child(e, name)))
        if d:
            return d
    return None


def parse_feed(body: bytes) -> list[dict]:
    root = decode_xml(body)
    items = []
    for e in iter_entries(root):
        title = entry_title(e)
        link = entry_link(e)
        if not title or not link:
            continue
        items.append(
            {
                "title": title,
                "link": link,
                "date": entry_date(e),
                "thumb": entry_thumb(e),
                "summary": entry_summary(e),
            }
        )
    return items


def make_id(source_id: str, link: str) -> str:
    return sha1(f"{source_id}|{link}".encode()).hexdigest()[:16]


def load_json(path: Path):
    if not path.exists():
        return {"items": []}
    try:
        return json.loads(path.read_text())
    except Exception:
        return {"items": []}


def item_payload(raw: dict, feed: dict, bars, cutoff: datetime) -> dict | None:
    d = raw.get("date")
    if d and d < cutoff:
        return None
    # keep undated items only from bar feeds (rare empty dates); drop undated media
    if not d and feed.get("group") != "bar":
        return None
    title = raw["title"]
    if SKIP_TITLE.search(title):
        return None
    summary = raw.get("summary") or ""
    text = f"{title} {strip_html(summary)}"
    matched = match_bars(text, bars, feed.get("bar"))
    if feed.get("group") == "media" and not matched and not DRINKS_RX.search(title) and not DRINKS_RX.search(strip_html(summary)[:400]):
        return None
    out = {
        "id": make_id(feed["id"], raw["link"]),
        "title": title,
        "source": feed["name"],
        "sourceId": feed["id"],
        "link": raw["link"],
    }
    if d:
        out["date"] = iso(d)
    thumb = raw.get("thumb") or ""
    if thumb:
        out["thumb"] = thumb
    ex = excerpt(summary)
    if ex:
        out["excerpt"] = ex
    if matched:
        out["bar"] = matched[0]
        if len(matched) > 1:
            out["bars"] = matched
    tags = topics_of(title)
    if tags:
        out["tags"] = tags
    return out


def merge(old_items: list, new_by_source: dict, failed: set, kind: str, cutoff: datetime, cap: int):
    # Keep previous items from failed sources (still in window)
    kept = []
    for it in old_items:
        if it.get("sourceId") in failed:
            d = parse_date(it.get("date"))
            if not d or d >= cutoff:
                kept.append(it)
    fresh = []
    for sid, items in new_by_source.items():
        items = sorted(items, key=lambda it: it.get("date") or "", reverse=True)[:CAP_PER_SOURCE]
        fresh.extend(items)
    all_items = fresh + kept
    # dedupe by id, prefer fresh
    seen = set()
    uniq = []
    for it in all_items:
        i = it.get("id")
        if not i or i in seen:
            continue
        seen.add(i)
        uniq.append(it)

    def key(it):
        return it.get("date") or ""

    uniq.sort(key=key, reverse=True)
    return uniq[:cap]


def dump(path: Path, items: list, updated: str) -> bool:
    payload = {"updated": updated, "items": items}
    new = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    old = path.read_text() if path.exists() else ""
    # Compare items only so a timestamp-only change does not count as new content
    def items_blob(s: str):
        try:
            return json.dumps(json.loads(s).get("items"), ensure_ascii=False, sort_keys=True)
        except Exception:
            return s

    changed = items_blob(old) != items_blob(new)
    if changed or not path.exists():
        path.write_text(new)
    return changed


def main() -> int:
    feeds = json.loads((DATA / "feeds.json").read_text())["feeds"]
    bars = load_bars()
    cutoff = now_utc() - timedelta(days=DAYS)
    updated = iso(now_utc())

    old_trends = load_json(DATA / "trends.json")
    old_news = load_json(DATA / "news.json")

    new_trends: dict[str, list] = {}
    new_news: dict[str, list] = {}
    failed_yt, failed_news = set(), set()
    ok = 0

    for feed in feeds:
        sid, url, kind = feed["id"], feed["url"], feed["kind"]
        try:
            body = fetch(url)
            raw_items = parse_feed(body)
            cooked = []
            for raw in raw_items:
                it = item_payload(raw, feed, bars, cutoff)
                if it:
                    cooked.append(it)
            if kind == "youtube":
                new_trends[sid] = cooked
            else:
                new_news[sid] = cooked
            ok += 1
            print(f"OK  {sid:16} {len(raw_items):3} raw, {len(cooked):3} kept  ({feed['name']})")
        except Exception as e:
            print(f"FAIL {sid:16} {type(e).__name__}: {e}", file=sys.stderr)
            if kind == "youtube":
                failed_yt.add(sid)
            else:
                failed_news.add(sid)

    trends = merge(old_trends.get("items") or [], new_trends, failed_yt, "youtube", cutoff, CAP_TRENDS)
    news = merge(old_news.get("items") or [], new_news, failed_news, "news", cutoff, CAP_NEWS)
    ch_t = dump(DATA / "trends.json", trends, updated)
    ch_n = dump(DATA / "news.json", news, updated)
    print(f"Wrote trends.json ({len(trends)} items, {'changed' if ch_t else 'unchanged'})")
    print(f"Wrote news.json   ({len(news)} items, {'changed' if ch_n else 'unchanged'})")
    print(f"Feeds ok {ok}/{len(feeds)}, failed {len(failed_yt)+len(failed_news)}")
    # exit 0 even when some feeds fail; exit 1 only if nothing could be written and no prior data
    if ok == 0 and not trends and not news:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
