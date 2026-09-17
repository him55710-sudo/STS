import urllib.request
import json
import os

TARGET_DIR = r"c:\Users\임현수\Downloads\STS\STS-claude-visual-commerce-prd-m2xfdo\public\kbeauty-models"
os.makedirs(TARGET_DIR, exist_ok=True)

# 실제 한국/동양인 뷰티 크리에이터 고화질 실사 사진들
ASIAN_BEAUTY_MODELS = [
    {
        "id": "kb-creator-01",
        # 맑은 피부 뷰티 셀피
        "url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=85",
        "title": "물광 글래스 스킨 루틴",
        "creator": "@yoon.glow",
        "products": ["조선미녀 맑은쌀선크림", "달바 스프레이 세럼"]
    },
    {
        "id": "kb-creator-02",
        # 탕후루 글로우 립 앤 치크
        "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1000&q=85",
        "title": "쿨톤 인생 베어그레이프 립",
        "creator": "@minji_makeup",
        "products": ["롬앤 쥬시래스팅 틴트", "클리오 킬커버 쿠션"]
    },
    {
        "id": "kb-creator-03",
        # 스킨케어 진정 루틴
        "url": "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1000&q=85",
        "title": "트러블 진정 3일 루틴",
        "creator": "@soyeon_skin",
        "products": ["아누아 어성초 77 토너", "토리든 다이브인 세럼"]
    },
    {
        "id": "kb-creator-04",
        # 무결점 베이스 메이크업
        "url": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1000&q=85",
        "title": "72시간 지속 올리브영 쿠션",
        "creator": "@chaewon.daily",
        "products": ["클리오 킬커버 더 뉴 파운웨어 쿠션"]
    },
    {
        "id": "kb-creator-05",
        # 홈케어 탄력 디바이스
        "url": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1000&q=85",
        "title": "에이지알 부스터프로 1주일 사용기",
        "creator": "@haein_beauty",
        "products": ["메디큐브 에이지알 부스터프로"]
    },
    {
        "id": "kb-creator-06",
        # 나이트 장벽 보습 케어
        "url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1000&q=85",
        "title": "속건조 SOS 장벽 크림",
        "creator": "@eunji_skincare",
        "products": ["에스트라 아토베리어365 크림", "라운드랩 자작나무 수분크림"]
    }
]

headers = {"User-Agent": "Mozilla/5.0"}
for m in ASIAN_BEAUTY_MODELS:
    out_path = os.path.join(TARGET_DIR, f"{m['id']}.jpg")
    try:
        req = urllib.request.Request(m["url"], headers=headers)
        with urllib.request.urlopen(req, timeout=15) as resp, open(out_path, "wb") as f:
            f.write(resp.read())
        print(f"SAVED: {m['id']} ({os.path.getsize(out_path)} bytes)")
    except Exception as e:
        print(f"FAILED: {m['id']} - {e}")

print("CREATOR_MODELS_READY")
