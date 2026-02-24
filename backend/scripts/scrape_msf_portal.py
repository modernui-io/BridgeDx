# scripts/scrape_msf_portal.py
# Scrapes key MSF Clinical Guidelines portal pages.
# Uses the correct /en/viewport/CG/english/ URL structure (updated 2025).

import requests
from bs4 import BeautifulSoup
import time
import os

# Chapter-level pages that contain the most critical BridgeDx-relevant content
MSF_PORTAL_PAGES = {
    "chapter_1_symptoms_syndromes": "https://medicalguidelines.msf.org/en/viewport/CG/english/chapter-1-a-few-symptoms-and-syndromes-16689158.html",
    "chapter_2_respiratory": "https://medicalguidelines.msf.org/en/viewport/CG/english/chapter-2-respiratory-diseases-16689154.html",
    "chapter_6_parasitic": "https://medicalguidelines.msf.org/en/viewport/CG/english/chapter-6-parasitic-diseases-16689166.html",
    "chapter_7_bacterial": "https://medicalguidelines.msf.org/en/viewport/CG/english/chapter-7-bacterial-diseases-16689168.html",
    "chapter_8_viral": "https://medicalguidelines.msf.org/en/viewport/CG/english/chapter-8-viral-diseases-16689170.html",
    "chapter_12_other": "https://medicalguidelines.msf.org/en/viewport/CG/english/chapter-12-other-conditions-16689178.html",
}

os.makedirs("data/raw", exist_ok=True)

HEADERS = {"User-Agent": "BridgeDx Research Bot/1.0 (humanitarian AI research)"}

for name, url in MSF_PORTAL_PAGES.items():
    print(f"Scraping {name} ...")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        # Try multiple content selectors — MSF portal has changed markup
        content = (
            soup.find("div", class_="field--name-body")
            or soup.find("div", class_="content-body")
            or soup.find("div", {"role": "main"})
            or soup.find("main")
            or soup.find("article")
        )

        if content:
            text = content.get_text(separator="\n", strip=True)
        else:
            # Fallback: grab all paragraph text from the page
            text = "\n".join(p.get_text(strip=True) for p in soup.find_all(["p", "li", "h2", "h3", "h4"]))

        if text.strip():
            out_path = f"data/raw/msf_portal_{name}.txt"
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"SOURCE: MSF Medical Guidelines Portal\n")
                f.write(f"TOPIC: {name}\n")
                f.write(f"URL: {url}\n")
                f.write("---\n")
                f.write(text)
            print(f"  ✓ Saved {out_path} ({len(text):,} chars)")
        else:
            print(f"  ✗ No content extracted for {name}")
    except Exception as e:
        print(f"  ✗ Failed {name}: {e}")
    time.sleep(2)  # Polite crawl rate

print("\nDone.")
