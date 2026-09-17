import urllib.request
import os

TARGET_DIR = r"c:\Users\임현수\Downloads\STS\STS-claude-visual-commerce-prd-m2xfdo\public\kbeauty-models"
os.makedirs(TARGET_DIR, exist_ok=True)

# 검증된 초고해상도 뷰티/스킨케어 인플루언서 실사 이미지들 (Unsplash 직링크)
MODELS = [
    {
        "id": "model-glass-skin",
        "url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=1000&q=85",
        "desc": "조선미녀 맑은쌀선크림 & 달바 미스트 촉촉 글래스 스킨"
    },
    {
        "id": "model-glow-lip",
        "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85",
        "desc": "롬앤 베어그레이프 탕후루 립 메이크업"
    },
    {
        "id": "model-cushion-base",
        "url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85",
        "desc": "클리오 킬커버 더 뉴 파운웨어 쿠션 베이스"
    },
    {
        "id": "model-soothing-routine",
        "url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85",
        "desc": "아누아 어성초 토너 & 토리든 수분 세럼 루틴"
    },
    {
        "id": "model-device-care",
        "url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85",
        "desc": "메디큐브 에이지알 부스터프로 광채 홈케어"
    },
    {
        "id": "model-barrier-night",
        "url": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1000&q=85",
        "desc": "에스트라 아토베리어 & 라운드랩 수분크림 나이트케어"
    },
    {
        "id": "model-cleansing-pure",
        "url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1000&q=85",
        "desc": "마녀공장 퓨어 클렌징 오일 딥 클렌징 씬"
    },
    {
        "id": "model-sun-daily",
        "url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=85",
        "desc": "데일리 K-선케어 루틴"
    }
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

for m in MODELS:
    out_path = os.path.join(TARGET_DIR, f"{m['id']}.jpg")
    try:
        req = urllib.request.Request(m["url"], headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp, open(out_path, "wb") as f:
            f.write(resp.read())
        size = os.path.getsize(out_path)
        print(f"SUCCESS: {m['id']} ({size} bytes)")
    except Exception as e:
        print(f"FAILED: {m['id']} - {e}")

print("MODELS_DOWNLOAD_COMPLETE")
