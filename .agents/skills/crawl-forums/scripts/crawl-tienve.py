#!/usr/bin/env python3
"""
crawl-tienve.py — Crawl tác phẩm NTHL từ tienve.org
=====================================================
Trang tác giả liệt kê ~18 tác phẩm. Mỗi link → trang chi tiết.
Output: output/crawled/tienve_raw.json
"""

import json, re, time, sys, os
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    os.system(f"{sys.executable} -m pip install requests beautifulsoup4 -q")
    import requests
    from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent.parent
OUTPUT_FILE = BASE_DIR / "output" / "crawled" / "tienve_raw.json"

AUTHOR_URL = "https://www.tienve.org/home/authors/viewAuthors.do?action=show&authorId=391"
BASE_URL = "https://www.tienve.org"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


def fetch_page(url, retries=3):
    """Fetch a page with retries."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.encoding = 'utf-8'
            if resp.status_code == 200:
                return resp.text
            print(f"  ⚠️ Status {resp.status_code} for {url}")
        except Exception as e:
            print(f"  ⚠️ Error attempt {attempt+1}: {e}")
            time.sleep(2)
    return None


def parse_author_page(html):
    """Parse trang tác giả, lấy danh sách link tác phẩm."""
    soup = BeautifulSoup(html, 'html.parser')
    works = []

    # Tìm tất cả link có viewArtwork
    for link in soup.find_all('a', href=True):
        href = link['href']
        if 'viewArtwork' not in href or 'artworkId' not in href:
            continue

        # Lấy artworkId
        match = re.search(r'artworkId=(\d+)', href)
        if not match:
            continue

        artwork_id = match.group(1)
        title = link.get_text(strip=True)

        if not title or title == '(...)':
            continue

        # Tìm genre hint (text sau link thường có "(thơ)" hoặc "(truyện / tuỳ bút)")
        genre_hint = ""
        next_text = link.next_sibling
        if next_text and isinstance(next_text, str):
            genre_match = re.search(r'\(([^)]+)\)', next_text)
            if genre_match:
                genre_hint = genre_match.group(1).strip()

        # Build full URL
        if href.startswith('/') or href.startswith('http'):
            full_url = href if href.startswith('http') else BASE_URL + href
        else:
            full_url = BASE_URL + '/' + href

        # Remove jsessionid
        full_url = re.sub(r';jsessionid=[A-Za-z0-9]+', '', full_url)

        works.append({
            'artworkId': artwork_id,
            'title': title,
            'genreHint': genre_hint,
            'url': full_url,
        })

    # Dedup by artworkId
    seen = {}
    for w in works:
        if w['artworkId'] not in seen:
            seen[w['artworkId']] = w
    return list(seen.values())


def extract_article_content(html):
    """Extract nội dung bài viết từ trang chi tiết tienve."""
    soup = BeautifulSoup(html, 'html.parser')

    # Xoá navigation, header, footer
    for tag in soup.find_all(['script', 'style', 'nav']):
        tag.decompose()

    # Tìm nội dung chính — tienve thường dùng table layout
    # Nội dung bài nằm trong phần body chính, sau tên tác giả
    text_parts = []

    # Strategy: lấy tất cả text, loại bỏ phần navigation/menu
    body = soup.find('body')
    if not body:
        return ""

    full_text = body.get_text('\n', strip=False)

    # Tìm vị trí bắt đầu nội dung (sau tên tác giả)
    author_markers = ['Nguyễn Thế Hoàng Linh', 'nguyenthehoanglinh']
    start_idx = 0
    for marker in author_markers:
        idx = full_text.find(marker)
        if idx > -1:
            # Tìm newline sau tên tác giả
            nl_idx = full_text.find('\n', idx + len(marker))
            if nl_idx > -1:
                start_idx = max(start_idx, nl_idx + 1)

    # Tìm vị trí kết thúc nội dung (trước footer)
    end_markers = ['Các hoạ phẩm sử dụng', 'Bản quyền Tiền Vệ', 'tất cả những tác phẩm']
    end_idx = len(full_text)
    for marker in end_markers:
        idx = full_text.find(marker)
        if idx > -1:
            end_idx = min(end_idx, idx)

    content = full_text[start_idx:end_idx].strip()

    # Clean up
    # Loại bỏ menu items thừa
    menu_items = [
        'sinh hoạt', 'diễn đàn', 'văn học', 'âm nhạc', 'sân khấu',
        'tạo hình', 'sách', 'tạp chí Việt', 'nhóm chủ trương', 'help',
        'thơ', 'phỏng vấn', 'tiểu thuyết', 'tiểu luận / nhận định',
        'thư toà soạn', 'tư tưởng', 'kịch bản văn học', 'ý kiến độc giả',
        'sổ tay', 'thảo luận', 'ký sự / tường thuật', 'tư liệu / biên khảo',
        'thông báo', 'truyện / tuỳ bút',
    ]
    lines = content.split('\n')
    filtered = []
    for line in lines:
        stripped = line.strip().lower()
        if stripped in menu_items:
            continue
        if stripped.startswith('http://') or stripped.startswith('https://'):
            continue
        filtered.append(line)

    content = '\n'.join(filtered)
    # Collapse multiple blank lines
    content = re.sub(r'\n{3,}', '\n\n', content)

    return content.strip()


def main():
    print("=" * 60)
    print("  Crawl tienve.org — Tác phẩm NTHL")
    print("=" * 60)
    print()

    # 1. Fetch trang tác giả
    print("📂 Fetch trang tác giả...")
    html = fetch_page(AUTHOR_URL)
    if not html:
        print("❌ Không thể fetch trang tác giả!")
        sys.exit(1)

    # 2. Parse danh sách tác phẩm
    work_links = parse_author_page(html)
    print(f"   Tìm thấy {len(work_links)} tác phẩm\n")

    if not work_links:
        print("❌ Không tìm thấy tác phẩm nào!")
        sys.exit(1)

    # 3. Crawl từng bài
    results = []
    for i, w in enumerate(work_links, 1):
        print(f"   [{i}/{len(work_links)}] {w['title'][:50]}...")
        html = fetch_page(w['url'])
        if not html:
            print(f"     ⚠️ Skip — không fetch được")
            continue

        content = extract_article_content(html)
        if not content:
            print(f"     ⚠️ Skip — không tìm thấy nội dung")
            continue

        results.append({
            'source': 'tienve',
            'sourceUrl': w['url'],
            'artworkId': w['artworkId'],
            'title': w['title'],
            'genreHint': w['genreHint'],
            'content': content,
            'publishedAt': None,  # tienve không hiện ngày
        })
        print(f"     ✅ {len(content):,} chars")
        time.sleep(1)

    # 4. Save
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"  ✅ Crawl tienve.org hoàn thành!")
    print(f"     Tác phẩm: {len(results)}")
    print(f"     Output: {OUTPUT_FILE.relative_to(BASE_DIR)}")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
