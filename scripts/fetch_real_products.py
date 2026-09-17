import os
import urllib.request
import urllib.parse
import json

TARGET_DIR = r"c:\Users\임현수\Downloads\STS\STS-claude-visual-commerce-prd-m2xfdo\public\products"
os.makedirs(TARGET_DIR, exist_ok=True)

# 실제 판매되는 최고 인기 K-뷰티 베스트셀러 상품 목록 및 공식 실사 이미지 URL들
PRODUCTS_TO_FETCH = [
    {
        "id": "kb-boj-sun",
        "name": "조선미녀 맑은쌀선크림 SPF50+ PA++++ 50ml",
        "brand": "Beauty of Joseon",
        # 공인된 고해상도 공식 이미지
        "url": "https://m.beautyofjoseon.co.kr/web/product/big/202305/0c19b02a2818987ecdd49d012423ef82.png"
    },
    {
        "id": "kb-anua-toner",
        "name": "아누아 어성초 77% 수분 진정 토너 250ml",
        "brand": "Anua",
        "url": "https://anua.kr/web/product/big/202404/fa12b87c784918e95c1c8430b2daedda.png"
    },
    {
        "id": "kb-dalba-serum",
        "name": "달바 화이트 트러플 퍼스트 스프레이 세럼 100ml",
        "brand": "d'Alba",
        "url": "https://dalba.co.kr/web/product/big/202311/d1e2e6040d7718e0a3eb278632fe2366.jpg"
    },
    {
        "id": "kb-roundlab-cream",
        "name": "라운드랩 자작나무 수분 크림 80ml",
        "brand": "ROUND LAB",
        "url": "https://roundlab.co.kr/web/product/big/202304/083ceb161ea87d373eaefebdf7305928.jpg"
    },
    {
        "id": "kb-romand-tint",
        "name": "롬앤 쥬시 래스팅 틴트 25 베어그레이프",
        "brand": "rom&nd",
        "url": "https://romand.co.kr/web/product/big/202106/59ff6ad79929849509dfbafe9b139db9.jpg"
    },
    {
        "id": "kb-clio-cushion",
        "name": "클리오 킬커버 더 뉴 파운웨어 쿠션 기획세트",
        "brand": "CLIO",
        "url": "https://clubclio.co.kr/web/product/big/202208/a4b27670bb15049b494191c015b6d518.jpg"
    },
    {
        "id": "kb-manyo-oil",
        "name": "마녀공장 퓨어 클렌징 오일 200ml",
        "brand": "ma:nyo",
        "url": "https://www.manyo.co.kr/data/goods/1/2022/04/2491_tmp_e23c72b2c39d89fc28fcba9fbafce1814674view.jpg"
    },
    {
        "id": "kb-torriden-serum",
        "name": "토리든 다이브인 저분자 히알루론산 세럼 50ml",
        "brand": "Torriden",
        "url": "https://torriden.com/web/product/big/202303/75e219ba37d4eefd2e2f6946002fbe5c.jpg"
    },
    {
        "id": "kb-medicube-pro",
        "name": "메디큐브 에이지알 부스터 프로",
        "brand": "medicube",
        "url": "https://medicube.co.kr/web/product/big/202310/f14bb7be1f1b637d4554b5df5463ffca.png"
    },
    {
        "id": "kb-aestura-cream",
        "name": "에스트라 아토베리어365 크림 80ml",
        "brand": "AESTURA",
        "url": "https://www.aestura.com/upload/goods/202401/1704245672856.jpg"
    }
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

results = []
for p in PRODUCTS_TO_FETCH:
    filepath = os.path.join(TARGET_DIR, f"{p['id']}.jpg")
    try:
        req = urllib.request.Request(p["url"], headers=headers)
        with urllib.request.urlopen(req, timeout=10) as response, open(filepath, 'wb') as out_file:
            data = response.read()
            out_file.write(data)
        size = os.path.getsize(filepath)
        results.append({"id": p["id"], "success": True, "size": size, "path": filepath})
        print(f"SUCCESS: {p['id']} ({size} bytes)")
    except Exception as e:
        print(f"FAILED: {p['id']} - {e}")
        results.append({"id": p["id"], "success": False, "error": str(e)})

print("DONE")
