import requests
import time
import random

# Backend'imizin adresi
URL = 'http://localhost:3000/api/sensor'

# Başlangıç değerleri (Sistem sıfır filtre ile başlıyor)
water_level = 100.0
filter_clogging = 0.0

print("🚀 Simülasyon Başladı! Veriler NestJS'e saniyede bir pompalanıyor...\n")

while True:
    # Gerçek dünya simülasyonu: Su yavaş yavaş azalır, tıkanıklık yavaş yavaş artar
    water_level -= random.uniform(0.5, 3.0)
    filter_clogging += random.uniform(0.5, 4.0)

    # Eğer tıkanıklık 100'ü geçerse, sanki işçi gelip filtreyi temizlemiş gibi sistemi sıfırla
    if filter_clogging >= 100:
        print("\n🔧 İşçi müdahale etti, filtre temizlendi!\n")
        water_level = 100.0
        filter_clogging = 0.0
        time.sleep(3) # Temizlik molası

    # Eğer su seviyesi sıfırın altına düşerse toparla
    if water_level < 0:
        water_level = 100.0

    # Gönderilecek veri paketi
    data = {
        "waterLevel": round(water_level, 1),
        "filterClogging": round(filter_clogging, 1)
    }

    try:
        # Veriyi backend'e fırlat
        response = requests.post(URL, json=data)
        
        # Duruma göre terminale renkli bilgi yazdır
        if filter_clogging >= 70 or water_level <= 20:
            print(f"⚠️ KRİTİK: Su %{data['waterLevel']} | Tıkanıklık %{data['filterClogging']}")
        else:
            print(f"✅ Normal: Su %{data['waterLevel']} | Tıkanıklık %{data['filterClogging']}")
            
    except requests.exceptions.RequestException:
        print("❌ Sunucuya bağlanılamadı! Backend açık mı?")

    # 2 saniye bekle ve tekrarla
    time.sleep(2)