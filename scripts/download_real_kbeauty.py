import os
import urllib.request

TARGET_DIR = r"c:\Users\임현수\Downloads\STS\STS-claude-visual-commerce-prd-m2xfdo\public\products"
os.makedirs(TARGET_DIR, exist_ok=True)

ITEMS = [
    {
        "id": "kb-boj-sun",
        "url": "https://beautyofjoseon.com/cdn/shop/files/01_0805__-_EU_UK.jpg"
    },
    {
        "id": "kb-anua-toner",
        "url": "http://terglow.com/cdn/shop/files/anua-heartleaf-77-soothing-toner-hydrating-and-calming-skincare-415392.jpg?v=1748858729"
    },
    {
        "id": "kb-dalba-serum",
        "url": "https://eonlinestore.in/cdn/shop/files/d_albaPiedmontItalianWhiteTruffleSpraySerum.jpg?v=1780669490&width=1000"
    },
    {
        "id": "kb-roundlab-cream",
        "url": "https://roundlab.com/cdn/shop/files/birch-moisturizing-cream-round-lab-3.jpg"
    },
    {
        "id": "kb-romand-tint",
        "url": "https://romandbeauty.com/cdn/shop/files/03_bare_grape_1_0db1ad15-19c7-49b5-970a-a48a3a9fdd76.jpg?v=1774510656&width=600"
    },
    {
        "id": "kb-manyo-oil",
        "url": "https://ohlolly.com/cdn/shop/files/manyo_Pure_Cleansing_Oil_1200x.jpg?v=1758330985"
    },
    {
        "id": "kb-torriden-serum",
        "url": "https://koreanskincare.com/cdn/shop/files/03_95db45a4-3572-4c25-b6e0-913e3dacdfaf.jpg?v=1697453147"
    },
    {
        "id": "kb-medicube-pro",
        "url": "https://medicube.us/cdn/shop/files/250820_BoosterPro01_1.jpg?v=1765875402&width=1000"
    },
    {
        "id": "kb-clio-cushion",
        "url": "https://www.dodoskin.com/cdn/shop/files/CLIO-Kill-Cover-Founwear-Cushion-The-Original-15g-x-2ea-_Original-_-Refill_-3.jpg?v=1729228946&width=1000"
    },
    {
        "id": "kb-aestura-cream",
        "url": "https://cdn.shopify.com/s/files/1/0668/0022/2505/files/Photoroom_20241029_074351.jpg?v=1730180727&width=960&height=1024&crop=center"
    }
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

for item in ITEMS:
    filepath = os.path.join(TARGET_DIR, f"{item['id']}.jpg")
    try:
        req = urllib.request.Request(item["url"], headers=headers)
        with urllib.request.urlopen(req, timeout=15) as res, open(filepath, 'wb') as f:
            data = res.read()
            f.write(data)
        size = os.path.getsize(filepath)
        print(f"SUCCESS: {item['id']} ({size} bytes)")
    except Exception as e:
        print(f"FAILED: {item['id']} - {e}")

print("FETCH_FINISHED")
