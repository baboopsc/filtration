# Akıllı Su Filtrasyon ve Kestirimci Bakım Sistemi

Tekstil Mühendisliği (tekstil esaslı filtre kumaşları ve tıkanma analizi) ile Bilgisayar Mühendisliği (ESP32 IoT telemetri, kural motoru ve trend kestirimi) disiplinlerinin ortak çalışması olan bu proje; **5 litrelik çift hazneli fiziksel filtrasyon prototipinde** filtre tıkanıklığını, akış debisini ve kalan su seviyesini gerçek zamanlı olarak izleyen, 3 kademeli durum sınıflandırması ile trend tabanlı kestirimci bakım uyarısı üreten ve olayları PostgreSQL üzerinde kayıt altına alarak CSV raporlayan bir IoT izleme platformudur.

---

## 1. Proje Ekibi (6 Kişi)

* **Bilgisayar Mühendisliği:** Muzaffer Sarıarslan, Yusuf Kuzey, Ali Muhsin
* **Tekstil Mühendisliği:** Ceylin Değirmenci, Ecenaz Küçükkaya, Sena Kılınç

---

## 2. Sistem Mimarisi ve Fiziksel Prototip Kurgusu

Sistem, **Çift Beslemeli (Dual-Feed)** fiziksel hidrolik düzenekten canlı web paneline kadar dört katmandan oluşur:

```
Hat 1 (Temiz Su Kalibrasyonu): [5L Bidon 1] ──► [Pompa 1] ──► [Vana 1] ──┐
                                                                         ├──► [T Birleştirici]
Hat 2 (Partiküllü Su Deneyi):  [5L Bidon 2] ──► [Pompa 2] ──► [Vana 2] ──┘          │
                                                                                    ▼
                                     [PVC Somunlu Rakor (Tekstil Filtre + 3D Destek Diski)]
                                                                                    │
                                                                                    ▼
                                                  [1/2" Dişi Uç]─[YF-S201]─[1/2" Dişi Uç]
                                                                    │         │
                                                                    ▼         └──► [ESP32 DevKit (BOOT Sıfırlama) / sensor-bot.py]
                                                        [Atık / Çıkış Toplama Kabı]           │
                                                                                              │ HTTP POST /api/sensor
                                                                                              ▼
                                                                                  [NestJS 12 Backend (Port 3000)]
                                                                                    • class-validator DTO Doğrulama
                                                                                    • 3 Kademeli Kural Motoru
                                                                                    • Trend Tabanlı Kestirimci Bakım
                                                                                    • PostgreSQL (TypeORM) + Socket.IO
                                                                                              │
                                                                                              ▼
                                                                                  [React 19 + Vite Panel (Port 5173)]
                                                                                    • Canlı Recharts Grafiği (%70 / %20)
                                                                                    • Sistem Durum Kartları & CSV Rapor
```

### Fiziksel Prototip Bileşenleri
* **Mekanik / Tesisat & 3D:** 2 adet 5 L su bidonu, 2 adet 5 L su pompası (≥2–5 L/dk), 3–4 m 1/2 inç şeffaf silikon hortum, 2 adet 1/2 inç plastik küresel vana, 1 adet 1/2 inç T tipi hortum birleştirici, 1 adet 1/2 inç PVC somunlu rakor (sökülebilir tekstil filtre yuvası), 3D baskı delikli kumaş destek diski, tekstil filtre kumaşı, 2 adet 1/2 inç içten dişli hortum ucu, 8–10 adet vidalı metal hortum kelepçesi, teflon bant, plastik cırt kelepçe ve atık su toplama kabı.
* **Elektronik & Güç:** 1 adet ESP32 DevKit, 1 adet YF-S201 (1/2 inç) Hall-effect su akış sensörü, 10kΩ + 20kΩ gerilim bölücü direnç seti (5V → 3.3V GPIO koruması), harici pompa DC adaptörü, jumper kablolar ve Micro-USB kablo.

---

## 3. Teknik Detaylar

### 3.1. Tek Debi Sensöründen (YF-S201) Debi, Tıkanıklık ve Su Seviyesi Modeli

Fiziksel numunede yalnızca **YF-S201 (1/2 inç)** Hall-effect su akış sensörü kullanılarak üç telemetri metriği birlikte üretilir:

1. **Anlık Debi (`flowRate`, L/dk):** YF-S201 puls frekansı üzerinden ölçülür ($F = 7.5 \times Q$, temiz filtrede nominal debi $Q_{nominal} = 5.00\text{ L/dk}$).
2. **Filtre Tıkanıklığı (`filterClogging`, %):** Tekstil filtrede gözenek tıkanması ve kek (cake) tabakası arttıkça debi ters orantılı olarak azalır:
   ```
   filterClogging = clamp((1 - flowRate / nominalFlowLpm) * 100, 0, 100)
   ```
3. **5.0 L Bidon Su Seviyesi (`waterLevel`, %):** 5 litrelik besleme bidonundan geçen kümülatif su hacminin ($\sum Q \cdot \Delta t$) toplam kapasiteden düşülmesiyle kalan su yüzdesi hesaplanır.

### 3.2. 3 Kademeli Durum Yönetimi

| Parametre              | NORMAL | WARNING (Uyarı) | CRITICAL (Kritik) |
| :--------------------- | :----- | :-------------- | :---------------- |
| **Filtre Tıkanıklığı** | < %50  | %50 – %69.9     | >= %70            |
| **Su Depo Seviyesi**   | > %30  | %20.1 – %30     | <= %20            |

Herhangi bir parametre kritik eşiği aşarsa sistem durumu anında **CRITICAL** olarak işaretlenir ve bildirim bandı devreye girer.

### 3.3. Kestirimci Bakım (Trend Analizi)

Sistem, veritabanındaki son 5 ölçüm arasındaki tıkanıklık artış ivmesini analiz ederek kritik eşiğe (%70) tahmini kalan süreyi dakika cinsinden hesaplar (`estimatedMinutesToCritical`):

```
estimatedMinutesToCritical = (70 - mevcutTıkanıklık) / (saniyedekiArtışHızı * 60)
```

---

## 4. REST API Uçbirimleri

| Yöntem | Uç Nokta | Açıklama |
| :----- | :------- | :------- |
| `GET`  | `/api/sensor/health` | Sunucu sağlık kontrolü |
| `POST` | `/api/sensor` | Yeni ölçüm paketi gönder (`waterLevel`, `filterClogging`, `flowRate`, `deviceId`) |
| `GET`  | `/api/sensor?limit=20` | Son ölçümleri listele |
| `GET`  | `/api/sensor/failures?limit=100` | Yalnızca uyarı ve kritik kayıtları getir |
| `GET`  | `/api/sensor/summary` | Anlık durum özeti ve sayaçlar |
| `DELETE` | `/api/sensor` | Tüm ölçüm ve arıza kayıtlarını kalıcı olarak temizle |

---

## 5. Kurulum, Firmware ve Çalıştırma

### Gereksinimler
* Node.js v20+ (Önerilen: v22 / v24)
* Python 3.8+ (Yalnızca simülatör modu için `requests` paketiyle)
* PostgreSQL (`filtration-backend/.env` içindeki `DATABASE_URL`)
* Arduino IDE (ESP32 kart desteği ile `esp32-firmware/esp32_yfs201_sensor.ino` yüklemek için)

### Hızlı Başlatma Seçenekleri

* **Gerçek Sensör (ESP32 + YF-S201) Modu:** `start_all.bat` dosyasını çalıştırın. Yalnızca Backend (Port 3000) ve Frontend (Port 5173) başlar; simülatör çalıştırılmaz.
* **Simülatörlü Demo Modu:** `start_with_simulator.bat` dosyasını çalıştırın. Backend, Frontend ve `sensor-bot.py` (5L bidon + YF-S201 simülatörü) otomatik başlar.

### ESP32 + YF-S201 Firmware Kullanımı
1. `esp32-firmware/esp32_yfs201_sensor.ino` dosyasını Arduino IDE ile açın.
2. `WIFI_SSID`, `WIFI_PASSWORD` ve backend çalıştıran bilgisayarın yerel IP'sini (`SERVER_URL`) güncelleyin.
3. YF-S201 DATA pinini ESP32 GPIO 27 pinine (**10kΩ + 20kΩ gerilim bölücü** ile 5V → 3.3V düşürerek) bağlayıp kodu yükleyin.
4. **Sahada Fiziksel Sıfırlama & Kalibrasyon (`BOOT` / `GPIO 0` Butonu):**
   * **Kısa basış (< 1.5 sn):** 5 L besleme bidonu doldurulduğunda hacim sayacını `%100`'e sıfırlar.
   * **Uzun basış (>= 1.5 sn):** Hat 1 (Temiz Su) açıkken ölçülen anlık debiyi yeni `nominalFlowLpm` referansı olarak kaydeder.
   * *(Bilgisayar bağlantısında seri monitörden `r` ve `c` komutları da aynı işlevi görür.)*

### Manuel Başlatma

```bash
# Terminal 1 — Backend
cd filtration-backend
npm install
npm run start:dev

# Terminal 2 — Frontend
cd filtration-frontend
npm install
npm run dev

# Terminal 3 — Opsiyonel Python Simülatörü
python sensor-bot.py
```

---

## 6. Proje Yapısı

```
filtration/
├── esp32-firmware/
│   └── esp32_yfs201_sensor.ino  # ESP32 + YF-S201 1/2" Arduino/C++ kodu
├── filtration-backend/          # NestJS 12 API sunucusu
│   ├── src/
│   │   ├── dto/                 # class-validator giriş doğrulama sınıfları
│   │   ├── app.controller.ts    # HTTP uç nokta tanımları
│   │   ├── app.service.ts       # Kural motoru ve trend analizi
│   │   ├── app.module.ts        # Ortam değişkenli TypeORM yapılandırması
│   │   ├── sensor.entity.ts     # Veritabanı varlık tanımı
│   │   └── sensor.gateway.ts    # Socket.IO gerçek zamanlı yayın
│   └── .env.example             # Ortam değişkenleri şablonu
├── filtration-frontend/         # React 19 + Vite gösterge paneli
│   └── src/
│       ├── App.tsx              # Ana dashboard bileşeni
│       ├── App.css              # Dashboard stilleri
│       └── index.css            # Global stiller
├── sensor-bot.py                # 5L bidon ve YF-S201 fiziksel model simülatörü
├── start_all.bat                # Simülatörsüz başlat (Backend + Frontend)
├── start_with_simulator.bat     # Simülatörlü başlat (Backend + Frontend + Bot)
└── README.md
```
