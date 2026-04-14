#!/usr/bin/env python3
"""
crawl-ttvnol.py — Crawl tác phẩm NTHL từ ttvnol.com (XenForo)
===============================================================
Topic 221106: co-mot-ngoi-nha-moi (51 trang)
Topic 51077:  mong-moi-nguoi-gop-y-cho (190 trang)

Chỉ lấy bài của user "away" (ID: 45078).
Output: output/crawled/ttvnol_221106_raw.json
        output/crawled/ttvnol_51077_raw.json
"""

import json, re, time, sys, os
from pathlib import Path
from datetime import datetime, timezone

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    os.system(f"{sys.executable} -m pip install --break-system-packages requests beautifulsoup4 -q")
    import requests
    from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent.parent
OUTPUT_DIR = BASE_DIR / "output" / "crawled"

TOPICS = [
    {
        'id': '221106',
        'url': 'http://ttvnol.com/threads/co-mot-ngoi-nha-moi.221106/',
        'max_pages': 51,
        'output': OUTPUT_DIR / 'ttvnol_221106_raw.json',
        'checkpoint': OUTPUT_DIR / 'ttvnol_221106_checkpoint.json',
    },
    {
        'id': '51077',
        'url': 'http://ttvnol.com/threads/mong-moi-nguoi-gop-y-cho.51077/',
        'max_pages': 190,
        'output': OUTPUT_DIR / 'ttvnol_51077_raw.json',
        'checkpoint': OUTPUT_DIR / 'ttvnol_51077_checkpoint.json',
    },
]

AUTHOR_USER_ID = '45078'  # away's user ID

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'vi,en-US;q=0.7,en;q=0.3',
}

DELAY = 1.5   # giây giữa mỗi request
CHECKPOINT_EVERY = 5  # lưu checkpoint mỗi N trang


def fetch_page(url, retries=4):
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            resp.encoding = 'utf-8'
            if resp.status_code == 200:
                return resp.text
            print(f"    ⚠️ HTTP {resp.status_code}")
            if resp.status_code in (404, 410):
                return None
        except Exception as e:
            print(f"    ⚠️ Attempt {attempt+1}: {e}")
        wait = (attempt + 1) * 3
        print(f"    ⏳ Chờ {wait}s rồi retry...")
        time.sleep(wait)
    return None


def parse_date(date_str):
    """
    Parse ngày dạng DD/MM/YYYY từ ttvnol → ISO 8601.
    Ví dụ: '10/09/2005' → '2005-09-10T00:00:00Z'
    """
    if not date_str:
        return datetime.now(timezone.utc).isoformat()
    date_str = date_str.strip()
    # Try DD/MM/YYYY
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})', date_str)
    if m:
        day, month, year = m.group(1), m.group(2), m.group(3)
        try:
            dt = datetime(int(year), int(month), int(day), tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            pass
    # Fallback
    return datetime.now(timezone.utc).isoformat()


def clean_post_content(text):
    """
    Làm sạch nội dung post:
    - Loại bỏ signature block (URL blog Yahoo, v.v.)
    - Loại bỏ HTML artifacts
    - Normalize whitespace
    """
    if not text:
        return ''
    # Loại bỏ signature patterns
    sig_patterns = [
        r'http://blog\.360\.yahoo\.com[^\s\n]*',
        r'<font[^>]*>.*?</font>',
        r'<[^>]+>',
    ]
    for p in sig_patterns:
        text = re.sub(p, '', text, flags=re.DOTALL | re.IGNORECASE)

    # Normalize whitespace
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        line = line.strip()
        # Skip lines that are just URLs
        if re.match(r'^https?://\S+$', line):
            continue
        cleaned.append(line)

    text = '\n'.join(cleaned)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def parse_posts_from_page(html, topic_url, page_num):
    """
    Parse tất cả posts của 'away' từ một trang.
    XenForo 1.x (ttvnol) structure:
    - Post container: ol#messageList > li.message[id=post-XXXXXX]
    - Username: <a class="username">away</a>
    - Date: <span class="DateTime" title="DD/MM/YYYY lúc HH:MM">
    - Content: <div class="messageContent"> (NOT messageText which has sigs)
    """
    soup = BeautifulSoup(html, 'html.parser')
    posts = []

    # XenForo 1.x: posts in ol#messageList > li.message
    msg_list = soup.find(id='messageList')
    if msg_list:
        post_elements = msg_list.find_all('li', class_='message', recursive=False)
    else:
        post_elements = soup.find_all('li', class_='message')

    for post in post_elements:
        # Check username
        uname_el = post.find('a', class_='username')
        if not uname_el or uname_el.get_text(strip=True) != 'away':
            continue

        post_id = post.get('id', '')  # e.g. "post-4614049"

        # Date: <span class="DateTime" title="DD/MM/YYYY lúc HH:MM">
        date_str = ''
        dt_el = post.find('span', class_='DateTime')
        if dt_el:
            date_str = dt_el.get('title', '') or dt_el.get_text(strip=True)
        published_at = parse_date(date_str)

        # Content: div.messageContent is the post body (clean text)
        content_el = post.find('div', class_='messageContent')
        if not content_el:
            continue

        # Remove quote blocks and signature font tags
        for junk in content_el.find_all(
            ['blockquote', 'div'],
            class_=lambda c: c and any(x in c for x in ['bbCodeBlock', 'quote', 'messageTextEndMarker'])
        ):
            junk.decompose()
        for font in content_el.find_all('font'):
            if 'blog.360.yahoo.com' in font.get_text() or 'http://' in font.get_text():
                font.decompose()

        content = content_el.get_text('\n', strip=False)
        content = clean_post_content(content)

        if not content or len(content.strip()) < 5:
            continue

        post_url = topic_url.rstrip('/') + f'/page-{page_num}#{post_id}' if post_id else topic_url

        posts.append({
            'source': 'ttvnol',
            'topicId': topic_url.rstrip('/').split('.')[-1].split('/')[-1],
            'sourceUrl': post_url,
            'postId': post_id,
            'page': page_num,
            'username': 'away',
            'content': content,
            'publishedAt': published_at,
        })

    return posts


def crawl_topic(topic):
    topic_id = topic['id']
    base_url = topic['url']
    max_pages = topic['max_pages']
    output_file = topic['output']
    ckpt_file = topic['checkpoint']

    print(f"\n{'='*60}")
    print(f"  Crawl ttvnol topic {topic_id} ({max_pages} trang)")
    print(f"{'='*60}")

    # Load checkpoint
    start_page = 1
    all_posts = []
    if ckpt_file.exists():
        ckpt = json.loads(ckpt_file.read_text())
        start_page = ckpt.get('last_page', 0) + 1
        if output_file.exists():
            all_posts = json.loads(output_file.read_text(encoding='utf-8'))
        print(f"  🔄 Resume từ trang {start_page} ({len(all_posts)} posts đã có)")

    for page_num in range(start_page, max_pages + 1):
        if page_num == 1:
            page_url = base_url
        else:
            # XenForo pagination: base_url + page-N
            # ttvnol URL pattern: http://ttvnol.com/threads/xxx.ID/page-N
            page_url = base_url.rstrip('/') + f'/page-{page_num}'

        print(f"  📄 Trang {page_num}/{max_pages}: {page_url}")
        html = fetch_page(page_url)
        if not html:
            print(f"     ⚠️ Không fetch được trang {page_num}, bỏ qua")
            time.sleep(DELAY * 2)
            continue

        page_posts = parse_posts_from_page(html, base_url, page_num)
        all_posts.extend(page_posts)
        print(f"     ✅ {len(page_posts)} posts của 'away' (tổng: {len(all_posts)})")

        # Save checkpoint
        if page_num % CHECKPOINT_EVERY == 0 or page_num == max_pages:
            output_file.parent.mkdir(parents=True, exist_ok=True)
            output_file.write_text(json.dumps(all_posts, ensure_ascii=False, indent=2), encoding='utf-8')
            ckpt_file.write_text(json.dumps({'last_page': page_num}))
            print(f"     💾 Checkpoint saved @ trang {page_num}")

        time.sleep(DELAY)

    # Final save
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(all_posts, ensure_ascii=False, indent=2), encoding='utf-8')
    if ckpt_file.exists():
        ckpt_file.unlink()

    print(f"\n  ✅ Topic {topic_id} hoàn thành: {len(all_posts)} posts of 'away'")
    print(f"     Output: {output_file.relative_to(BASE_DIR)}")
    return len(all_posts)


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--topic', choices=['221106', '51077', 'all'], default='all')
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    total = 0
    for topic in TOPICS:
        if args.topic != 'all' and topic['id'] != args.topic:
            continue
        total += crawl_topic(topic)

    print(f"\n{'='*60}")
    print(f"  ✅ TTVNOL crawl hoàn thành! Tổng: {total} posts")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
