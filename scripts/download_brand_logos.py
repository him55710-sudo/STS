import urllib.request
import os

TARGET_DIR = r"c:\Users\임현수\Downloads\STS\STS-claude-visual-commerce-prd-m2xfdo\public\brands"
os.makedirs(TARGET_DIR, exist_ok=True)

# ZVZO의 브랜드 로고 목록
LOGOS = [
    "logo-01.svg", "logo-02.svg", "logo-03.svg", "logo-04.svg", "logo-05.svg",
    "logo-06.svg", "logo-07.svg", "logo-08.svg", "logo-10.svg", "logo-11.svg",
    "logo-12.svg", "logo-13.svg", "logo-15.svg", "logo-16.svg", "logo-17.svg",
    "logo-18.svg", "logo-19.svg", "logo-20.svg", "logo-21.svg", "logo-22.svg",
    "logo-23.svg", "logo-24.svg", "logo-25.svg", "logo-26.svg", "logo-27.svg",
    "logo-28.svg", "logo-29.svg", "logo-31.svg", "logo-32.svg", "logo-35.svg",
    "logo-37.svg", "logo-39.svg", "logo-41.svg", "logo-49.svg", "logo-77.svg",
    "logo-85.svg", "logo-89.svg", "logo-91.svg"
]

headers = {"User-Agent": "Mozilla/5.0"}
success_count = 0

for logo in LOGOS:
    url = f"https://creator.zvzo.xyz/brands/{logo}"
    out_path = os.path.join(TARGET_DIR, logo)
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp, open(out_path, "wb") as f:
            f.write(resp.read())
        success_count += 1
    except Exception as e:
        print(f"FAILED: {logo} - {e}")

print(f"DOWNLOADED {success_count}/{len(LOGOS)} BRAND LOGOS")
