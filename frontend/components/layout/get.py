import requests
from bs4 import BeautifulSoup
import json

BASE_URL = "https://www.irasutoya.com/search?q=アイコン"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
}

def get_icon_urls():
    response = requests.get(BASE_URL, headers=HEADERS)
    soup = BeautifulSoup(response.text, "html.parser")

    image_urls = []
    for img in soup.select("img[src^='https://1.bp.blogspot.com/']"):
        image_urls.append(img["src"])

    return image_urls

# アイコンURLを取得
icon_urls = get_icon_urls()

# JSONに保存
with open("icons.json", "w", encoding="utf-8") as f:
    json.dump(icon_urls, f, ensure_ascii=False, indent=2)

print(f"取得したアイコン数: {len(icon_urls)}")
