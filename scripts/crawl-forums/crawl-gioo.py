#!/usr/bin/env python3
"""
crawl-gioo.py — Crawl tác phẩm NTHL từ gio-o.com
===================================================
Output: output/crawled/gioo_raw.json
"""

import json, re, time, sys, os
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    os.system(f"{sys.executable} -m pip install --break-system-packages requests beautifulsoup4 -q")
    import requests
    from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent.parent
OUTPUT_FILE = BASE_DIR / "output" / "crawled" / "gioo_raw.json"

INDEX_URL = "https://www.gio-o.com/NTHL/nguyenthehoanglinh.html"
BASE_URL  = "https://www.gio-o.com"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
}


def fetch_page(url, retries=3):
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.encoding = 'utf-8'
            if resp.status_code == 200:
                return resp.text
            print(f"  ⚠️ Status {resp.status_code} for {url}")
            if resp.status_code in (502, 503, 404):
                return None  # don't retry server errors
        except Exception as e:
            print(f"  ⚠️ Attempt {attempt+1} error: {e}")
            time.sleep(3)
    return None


def parse_index(html):
    """Lấy danh sách link tác phẩm từ trang index."""
    soup = BeautifulSoup(html, 'html.parser')
    links = []
    for a in soup.find_all('a', href=True):
        href = a['href']
        # Gioo works thường là file HTML trong thư mục /NTHL/
        if not href:
            continue
        # Skip navigation links
        if any(skip in href.lower() for skip in ['mailto', 'javascript', 'facebook', 'twitter']):
            continue
        title = a.get_text(strip=True)
        if not title or len(title) < 3:
            continue
        # Build full URL
        if href.startswith('http'):
            full_url = href
        elif href.startswith('/'):
            full_url = BASE_URL + href
        else:
            full_url = BASE_URL + '/NTHL/' + href
        links.append({'title': title, 'url': full_url})
    return links


def extract_content(html):
    """Extract nội dung bài từ trang chi tiết gio-o."""
    soup = BeautifulSoup(html, 'html.parser')
    for tag in soup.find_all(['script', 'style', 'nav', 'header', 'footer']):
        tag.decompose()
    body = soup.find('body')
    if not body:
        return ''
    text = body.get_text('\n', strip=False)
    # Clean
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def main():
    print("=" * 60)
    print("  Crawl gio-o.com — Tác phẩm NTHL")
    print("=" * 60)

    html = fetch_page(INDEX_URL)
    if not html:
        print("❌ gio-o.com không truy cập được (502/503). Skip.")
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_FILE, 'w') as f:
            json.dump([], f)
        print(f"   Output: {OUTPUT_FILE.relative_to(BASE_DIR)} (empty)")
        return

    links = parse_index(html)
    # Filter to likely works (same domain, not gio-o.com home)
    works_links = [l for l in links if 'gio-o.com/NTHL' in l['url'] and l['url'] != INDEX_URL]
    # Dedup
    seen_urls = set()
    unique_links = []
    for l in works_links:
        if l['url'] not in seen_urls:
            seen_urls.add(l['url'])
            unique_links.append(l)

    print(f"\n   Tìm thấy {len(unique_links)} tác phẩm\n")

    results = []
    for i, w in enumerate(unique_links, 1):
        print(f"   [{i}/{len(unique_links)}] {w['title'][:50]}...")
        html2 = fetch_page(w['url'])
        if not html2:
            print(f"     ⚠️ Skip")
            continue
        content = extract_content(html2)
        if not content:
            print(f"     ⚠️ Empty content")
            continue
        results.append({
            'source': 'gioo',
            'sourceUrl': w['url'],
            'title': w['title'],
            'genreHint': '',
            'content': content,
            'publishedAt': None,
        })
        print(f"     ✅ {len(content):,} chars")
        time.sleep(1)

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"  ✅ gio-o.com hoàn thành! {len(results)} tác phẩm")
    print(f"     Output: {OUTPUT_FILE.relative_to(BASE_DIR)}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
