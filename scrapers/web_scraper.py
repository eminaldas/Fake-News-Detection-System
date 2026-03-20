import re
import logging
from dataclasses import dataclass
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 10
MAX_BODY_CHARS = 50_000
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; FNDS-Bot/1.0)"
}
NOISE_TAGS = ["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "form"]


class ScraperError(Exception):
    pass


@dataclass
class ScrapedArticle:
    title: str
    body: str
    url: str


def _remove_noise(soup: BeautifulSoup) -> None:
    for tag_name in NOISE_TAGS:
        for tag in soup.find_all(tag_name):
            tag.decompose()


def _extract_title(soup: BeautifulSoup) -> str:
    og = soup.find("meta", property="og:title")
    if og and og.get("content", "").strip():
        return og["content"].strip()[:512]
    h1 = soup.find("h1")
    if h1 and h1.get_text(strip=True):
        return h1.get_text(strip=True)[:512]
    t = soup.find("title")
    if t and t.get_text(strip=True):
        return t.get_text(strip=True)[:512]
    return ""


def _extract_body(soup: BeautifulSoup) -> str:
    for selector in (soup.find("article"), soup.find("main")):
        if selector:
            text = selector.get_text(separator=" ", strip=True)
            if len(text) > 100:
                return text[:MAX_BODY_CHARS]

    paragraphs = soup.find_all("p")
    if paragraphs:
        text = " ".join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
        if text.strip():
            return text[:MAX_BODY_CHARS]

    body = soup.find("body")
    if body:
        return body.get_text(separator=" ", strip=True)[:MAX_BODY_CHARS]
    return ""


def scrape_article(url: str) -> ScrapedArticle:
    """
    URL'den haber başlığı ve gövdesini çeker.
    Başarısızlık durumunda ScraperError fırlatır.
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ScraperError(f"Geçersiz URL şeması: {url!r}")
    except Exception as exc:
        raise ScraperError(f"URL ayrıştırma hatası: {exc}") from exc

    try:
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except requests.exceptions.Timeout:
        raise ScraperError(f"İstek zaman aşımı ({REQUEST_TIMEOUT}s): {url}")
    except requests.exceptions.HTTPError as exc:
        raise ScraperError(f"HTTP {exc.response.status_code}: {url}") from exc
    except requests.exceptions.RequestException as exc:
        raise ScraperError(f"Ağ hatası: {exc}") from exc

    # Türkçe sayfalar zaman zaman yanlış encoding döner
    if resp.encoding and resp.encoding.upper() in ("ISO-8859-1", "LATIN-1"):
        resp.encoding = resp.apparent_encoding or "utf-8"

    soup = BeautifulSoup(resp.text, "lxml")
    _remove_noise(soup)

    title = _extract_title(soup)
    body = re.sub(r"\s+", " ", _extract_body(soup)).strip()

    logger.info("Scraped: title=%d chars, body=%d chars | %s", len(title), len(body), url)
    return ScrapedArticle(title=title, body=body, url=url)
