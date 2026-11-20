"""
Akilli Su Filtrasyon Sistemi - Sensor Simulatoru (sensor-bot.py)
Fiziksel 5 litrelik besleme bidonu, PVC somunlu rakor icindeki tekstil filtre
ve ESP32 + YF-S201 (1/2 inc) Hall-effect akis sensorunu simule eder.
Verileri HTTP POST ile NestJS backend uzerine aktarir.
"""

import time
import random
import requests

# Backend API adresi ve fiziksel düzenek sabitleri
URL = 'http://localhost:3000/api/sensor'
DEVICE_ID = 'SIM-UNIT-01'
TANK_CAPACITY_L = 5.0       # 5 litrelik besleme bidonu
NOMINAL_FLOW_LPM = 5.0      # Temiz tekstil filtre referans debisi (L/dk)
INTERVAL_SECONDS = 2        # Veri gonderim periyodu

# Baslangic degerleri
remaining_liters = TANK_CAPACITY_L
filter_clogging = 0.0

print(f"[BILGI] Sensor simulatoru baslatildi. Cihaz ID: {DEVICE_ID}")
print(f"[BILGI] Fiziksel Model: {TANK_CAPACITY_L:.1f} L Besleme Bidonu | Nominal Debi: {NOMINAL_FLOW_LPM:.1f} L/dk")
print(f"[BILGI] Hedef API: {URL}")
print(f"[BILGI] Veri akisi {INTERVAL_SECONDS} saniyelik periyotlarla gonderiliyor...\n")

step = 0

while True:
    step += 1

    # Tekstil filtrede kek tabakasi (cake) ve gozenek tikanmasina bagli artis
    filter_clogging += random.uniform(1.0, 2.8)

    # Filtre tikanikligi 100'e ulastiginda PVC somunlu rakordaki tekstil kumas yenilenir
    if filter_clogging >= 100.0:
        print("\n[BAKIM] PVC rakor icindeki tekstil filtre yenilendi. Parametreler sifirlaniyor.\n")
        filter_clogging = 0.0
        remaining_liters = TANK_CAPACITY_L
        time.sleep(3)

    # Fiziksel YF-S201 akis debisi hesabi (L/dk): Tikaniklik arttikca debi duser
    flow_rate = max(
        0.2,
        round(NOMINAL_FLOW_LPM * (1.0 - (filter_clogging / 100.0)) + random.uniform(-0.08, 0.08), 2),
    )

    # 5.0 L bidondan gecen debiye bagli kümülatif hacim dusumu
    drained_liters = flow_rate * (INTERVAL_SECONDS / 60.0)
    remaining_liters = max(0.0, remaining_liters - drained_liters)

    # 5L bidon %5 (0.25 L) altina dustugunde dolum simule edilir
    if remaining_liters < (TANK_CAPACITY_L * 0.05):
        print("\n[DOLUM] 5.0 L besleme bidonu yeniden dolduruldu.\n")
        remaining_liters = TANK_CAPACITY_L

    water_level = round((remaining_liters / TANK_CAPACITY_L) * 100.0, 1)

    data = {
        "deviceId": DEVICE_ID,
        "waterLevel": water_level,
        "filterClogging": round(filter_clogging, 1),
        "flowRate": flow_rate,
    }

    try:
        response = requests.post(URL, json=data, timeout=5)

        # Durum belirleme (Terminal logu icin)
        if data["filterClogging"] >= 70 or data["waterLevel"] <= 20:
            level_tag = "KRITIK"
        elif data["filterClogging"] >= 50 or data["waterLevel"] <= 30:
            level_tag = "UYARI"
        else:
            level_tag = "NORMAL"

        print(
            f"[{level_tag}] "
            f"Adim #{step:03d} | "
            f"Su: %{data['waterLevel']:<5} ({remaining_liters:.2f}/{TANK_CAPACITY_L:.1f} L) | "
            f"Tikaniklik: %{data['filterClogging']:<5} | "
            f"Debi: {data['flowRate']} L/dk | "
            f"HTTP {response.status_code}"
        )

    except requests.exceptions.RequestException as err:
        print(f"[HATA] Sunucuya erisilemedi ({URL}). Backend servisi calisiyor mu? ({err.__class__.__name__})")

    time.sleep(INTERVAL_SECONDS)
