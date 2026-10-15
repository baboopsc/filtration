"""
Akilli Su Filtrasyon Sistemi - Sensor Simulatoru (sensor-bot.py)
Fiziksel ESP32 ve YF-S201 akis sensorunu simule eder.
Verileri HTTP POST ile NestJS backend uzerine aktarir.
"""

import time
import random
import requests

# Backend API adresi
URL = 'http://localhost:3000/api/sensor'
DEVICE_ID = 'SIM-UNIT-01'

# Baslangic degerleri
water_level = 100.0
filter_clogging = 0.0

print(f"[BILGI] Sensor simulatoru baslatildi. Cihaz ID: {DEVICE_ID}")
print(f"[BILGI] Hedef API: {URL}")
print("[BILGI] Veri akisi 2 saniyelik periyotlarla gonderiliyor...\n")

step = 0

while True:
    step += 1

    # Fiziksel davranis simulasyonu:
    # Su tuketimi ve filtrenin zamana bagli tikanmasi
    water_level -= random.uniform(0.6, 2.5)
    filter_clogging += random.uniform(0.8, 3.2)

    # Filtre tikanikligi 100'e ulastiginda bakim yapilmis varsayilarak sifirlanir
    if filter_clogging >= 100:
        print("\n[BAKIM] Filtre temizlendi / yenilendi. Parametreler sifirlaniyor.\n")
        water_level = 100.0
        filter_clogging = 0.0
        time.sleep(3)

    # Su deposu kritik altina dustugunde dolum simule edilir
    if water_level < 5:
        print("\n[DOLUM] Su deposu yeniden dolduruldu.\n")
        water_level = 100.0

    # Fiziksel akis debisi hesabi (L/dk): Tikaniklik arttikca debi duser
    # Nominal debi: 5.0 L/dk
    flow_rate = max(0.2, round(5.0 * (1.0 - (filter_clogging / 100.0)) + random.uniform(-0.1, 0.1), 2))

    data = {
        "deviceId": DEVICE_ID,
        "waterLevel": round(water_level, 1),
        "filterClogging": round(filter_clogging, 1),
        "flowRate": flow_rate
    }

    try:
        response = requests.post(URL, json=data, timeout=5)

        # Durum belirleme (Terminal logu icin)
        if filter_clogging >= 70 or water_level <= 20:
            level_tag = "KRITIK"
        elif filter_clogging >= 50 or water_level <= 30:
            level_tag = "UYARI"
        else:
            level_tag = "NORMAL"

        print(
            f"[{level_tag}] "
            f"Adim #{step:03d} | "
            f"Su: %{data['waterLevel']:<5} | "
            f"Tikaniklik: %{data['filterClogging']:<5} | "
            f"Debi: {data['flowRate']} L/dk | "
            f"HTTP {response.status_code}"
        )

    except requests.exceptions.RequestException as err:
        print(f"[HATA] Sunucuya erisilemedi ({URL}). Backend servisi calisiyor mu? ({err.__class__.__name__})")

    time.sleep(2)
