# Akıllı Su Filtrasyon ve Erken Uyarı Sistemi

Tekstil Mühendisliği (materyal/filtreleme) ve Bilgisayar Mühendisliği (telemetri/analitik) disiplinlerinin ortak çalışması olan bu proje; su filtrasyon sistemlerinde filtre tıkanıklığını ve depo su seviyesini gerçek zamanlı olarak izleyen, kural ve trend tabanlı erken uyarı (kestirimci bakım prototipi) üreten, olayları veritabanında kayıt altına alarak CSV raporlayan bir IoT izleme ve karar destek platformudur.

---

## 1. Sistem Mimarisi

Sistem üç temel katmandan oluşur:

```
[ Sensör Simülatörü (Python) / ESP32 + YF-S201 ]
                    |
                    | HTTP POST /api/sensor
                    | (Su Seviyesi, Tıkanıklık, Debi)
                    v
         [ NestJS Backend (Port 3000) ]
              - DTO Doğrulama (class-validator)
              - 3 Kademeli Kural Motoru
              - Trend Tabanlı Kestirimci Bakım
              - PostgreSQL Veri Kalıcılığı
              - Socket.IO Anlık Yayın
                    |
                    v
         [ React + Vite Dashboard (Port 5173) ]
              - Canlı Telemetri Grafiği
              - Sistem Durum Kartları
              - Kritik Alarm Bildirimi
              - Arıza Geçmişi ve CSV Rapor
```

---

## 2. Teknik Detaylar

### 2.1. Fiziksel Sensör Modeli ve Debi

Gerçek bir filtrasyon hattında filtrenin tıkanması, su akış hızını (debi) doğrudan düşürür. Sistem bu fiziksel bağıntıyı modellemektedir:

- Nominal debi: **5.00 L/dk**
- Filtre tıkanıklığı arttıkça debi ters orantılı olarak azalır:

```
flowRate = max(0.2, 5.0 x (1 - filterClogging / 100))
```

Bu model sayesinde gerçek ESP32 + YF-S201 sensör sinyalleri ile Python simülatörü aynı API formatını paylaşır.

### 2.2. 3 Kademeli Durum Yönetimi

Sistem yalnızca iki durumlu (sağlıklı/sağlıksız) bir yapı yerine endüstriyel standartlara uygun üç seviyeli durum modeli kullanır:

| Parametre             | Normal    | Uyarı           | Kritik    |
| :-------------------- | :-------- | :-------------- | :-------- |
| **Filtre Tıkanıklığı** | < %50    | %50 – %69.9     | >= %70    |
| **Su Depo Seviyesi**  | > %30     | %20.1 – %30     | <= %20    |

Herhangi bir parametre kritik eşiği aşarsa sistem durumu anında **KRİTİK** olarak işaretlenir ve alarm devreye girer.

### 2.3. Kestirimci Bakım (Trend Analizi)

Sistem, son ölçümlerdeki tıkanıklık artış ivmesini analiz ederek henüz kritik eşiğe ulaşılmadan uyarı üretir:

```
estimatedMinutesToCritical = (70 - mevcutTıkanıklık) / (saniyedekiArtışHızı x 60)
```

Hesaplanan süre, gösterge panelindeki "Kestirimci Bakım" kartında görüntülenir.

---

## 3. REST API Uçbirimleri

| Yöntem | Uç Nokta | Açıklama |
| :----- | :------- | :------- |
| `GET`  | `/api/sensor/health`          | Sunucu sağlık kontrolü |
| `POST` | `/api/sensor`                 | Yeni ölçüm paketi gönder (DTO doğrulamalı) |
| `GET`  | `/api/sensor?limit=20`        | Son ölçümleri listele |
| `GET`  | `/api/sensor/failures?limit=100` | Yalnızca uyarı ve kritik kayıtları getir |
| `GET`  | `/api/sensor/summary`         | Anlık durum özeti ve sayaçlar |

---

## 4. Kurulum ve Çalıştırma

### Gereksinimler

- Node.js v20 veya üzeri (Önerilen: v22 / v24)
- Python 3.8 veya üzeri
- PostgreSQL (veya `.env` dosyasındaki hazır Neon PostgreSQL bağlantısı)

### Hızlı Başlatma

Proje ana dizinindeki `start_all.bat` dosyasını çift tıklayarak çalıştırın. Backend, Frontend ve Sensör Simülatörü ayrı konsol pencerelerinde otomatik olarak başlar; tarayıcıda gösterge paneli açılır. Servisleri durdurmak için açılan konsol pencerelerini kapatmanız yeterlidir.

### Manuel Başlatma

**Terminal 1 — Backend (NestJS)**
```bash
cd filtration-backend
npm install
npm run start:dev
```
Sunucu `http://localhost:3000` adresinde başlar.

**Terminal 2 — Frontend (React + Vite)**
```bash
cd filtration-frontend
npm install
npm run dev
```
Gösterge paneli `http://localhost:5173` adresinde açılır.

**Terminal 3 — Sensör Simülatörü (Python)**
```bash
python sensor-bot.py
```
Simülatör her 2 saniyede bir ölçüm paketini backend'e gönderir.

---

## 5. Proje Yapısı

```
filtration/
├── filtration-backend/          # NestJS API sunucusu
│   ├── src/
│   │   ├── dto/                 # Giriş doğrulama sınıfları
│   │   ├── app.controller.ts    # HTTP uç nokta tanımları
│   │   ├── app.service.ts       # İş mantığı, kural motoru, trend analizi
│   │   ├── app.module.ts        # Modül yapılandırması
│   │   ├── sensor.entity.ts     # Veritabanı varlık tanımı
│   │   ├── sensor.gateway.ts    # Socket.IO gerçek zamanlı yayın
│   │   └── main.ts              # Uygulama giriş noktası
│   └── .env.example             # Ortam değişkenleri şablonu
├── filtration-frontend/         # React + Vite gösterge paneli
│   └── src/
│       ├── App.tsx              # Ana dashboard bileşeni
│       ├── App.css              # Dashboard stilleri
│       └── index.css            # Global stiller
├── sensor-bot.py                # Python sensör simülatörü
├── start_all.bat                # Tek tıkla tüm altyapıyı başlat
└── README.md
```

---

## 6. Tamamlanan Geliştirmeler

- [x] Veritabanı bağlantı bilgisi `.env` dosyasına taşındı; kod tabanından kaldırıldı
- [x] DTO giriş doğrulaması (`class-validator`) eklendi; geçersiz veriler HTTP 400 ile reddediliyor
- [x] 3 kademeli durum mantığı (Normal, Uyarı, Kritik) aktif
- [x] Kestirimci bakım trend analizi (`estimatedMinutesToCritical`) eklendi
- [x] Fiziksel debi modeli (`flowRate`) ve cihaz kimliği (`deviceId`) entegre edildi
- [x] Socket.IO anlık veri senkronizasyonu çalışıyor
- [x] Dashboard'da bağlantı göstergesi ve son ölçüm zaman sayacı eklendi
- [x] Grafik üzerinde referans eşik çizgileri (%70 ve %20) eklendi
- [x] Arıza geçmişini veritabanından çekerek CSV olarak indirme özelliği eklendi
- [x] Arayüz ve konsol çıktıları emojilerden arındırıldı
- [x] Vitest birim testleri hatasız çalışıyor
- [x] Tek tıkla başlatma scripti (`start_all.bat`) oluşturuldu
- [x] Hatalı `sensor-bot.py.py` dosya adı düzeltildi