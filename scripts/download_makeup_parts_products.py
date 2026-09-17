import urllib.request
import os

images = {
    "kb-clio-liner.jpg": "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=500&auto=format&fit=crop&q=80", # eyeliner
    "kb-etude-brow.jpg": "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&auto=format&fit=crop&q=80", # eyebrow pencil
    "kb-toocool-shading.jpg": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80", # contour palette
    "kb-3ce-blush.jpg": "https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=500&auto=format&fit=crop&q=80", # blush
    "kb-glint-highlighter.jpg": "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=500&auto=format&fit=crop&q=80", # highlighter
}

target_dir = r"c:\Users\임현수\Downloads\STS\STS-claude-visual-commerce-prd-m2xfdo\public\products"
headers = {"User-Agent": "Mozilla/5.0"}

for filename, url in images.items():
    path = os.path.join(target_dir, filename)
    if not os.path.exists(path):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp, open(path, "wb") as f:
                f.write(resp.read())
            print(f"Downloaded {filename}")
        except Exception as e:
            print(f"Error downloading {filename}: {e}")
