# Akilli Su Filtrasyon ve Erken Uyari Sistemi (IoT Telemetri Paneli)

Bu proje; su filtrasyon sistemlerinde filtre tikanikligi ve depo su seviyesini gercek zamanli izleyen, kural ve trend tabanli erken uyari (kestirimci bakim prototipi) ureten, olaylari veritabaninda kayit altina alarak raporlayan bir IoT izleme ve karar destek platformudur. Tekstil Muhendisligi (materyal/filtreleme) ve Bilgisayar Muhendisligi (telemetri/analitik) ortak calismasidir.

---

## 1. Sistem Mimarisi ve Calisma Prensibi

Sistem 3 temel katmandan olusur:

```
[ Sensor Simulatoru / ESP32 ]
            |
            | HTTP POST /api/sensor (Su Seviyesi, Tikaniklik, Debi)
            v
[ NestJS Backend ]
   - DTO Dogrulama (class-validator)
   - 3 Seviyeli Kural Motoru (Normal / Uyari / Kritik)
   - Trend Tabanli Kestirimci Bakim Hesabi
   - PostgreSQL Veri Kaliciligi
   - Socket.IO Anlik Yayin
            |
            +-------------> [ React Dashboard ]
                               - Canli Telemetri Grafigi (Recharts)
                               - Sistem Durum ve Metrik Kartlari
                               - Anlik Kritik Alarm Banner'i
                               - Ariza Gecmisi ve CSV Raporlama
```

### 1.1. Fiziksel Sensor Modeli ve Debi (Flow Rate)
Gercek bir filtrasyon hattinda filtrenin tikanmasi dogrudan su akis hizinin (debi) dusmesine yol acar. 
- Sistemde nominal debi: **5.00 L/dk**
- Filtre tikanikligi arttikca debi ters orantili olarak azalir:
  `flowRate = max(0.2, 5.0 * (1 - filterClogging / 100))`
- Bu sayede gerek ESP32 ve YF-S201 su debi sensorunden gelen gercek sinyaller, gerekse Python simulatoru tarafindan uretilen fiziksel model backend tarafindan ayni formatta islenir.

### 1.2. Kural Motoru ve 3 Kademeli Durum Yonetimi
Sistem sadece saglikli/sagliksiz seklinde iki durum yerine, gercek endustriyel standartlara uygun 3 seviyeli durum modeli kullanir:

| Parametre | Normal | Uyari (Warning) | Kritik (Critical) |
| :--- | :--- | :--- | :--- |
| **Filtre Tikanikligi** | < %50 | %50 - %69.9 | >= %70 |
| **Su Depo Seviyesi** | > %30 | %20.1 - %30 | <= %20 |

Eger herhangi bir parametre kritik esige ulasirsa sistem durumu derhal **CRITICAL** durumuna gecer.

### 1.3. Trend Tabanli Kestirimci Bakim (Predictive Maintenance Prototipi)
Sistem son olcumlerin zamana gore degisim egimini (tikaniklik artis hizi) analiz eder:
- Eger tikaniklik artis yonundeyse ve kritik sinirin altindaysa, kritik esik olan %70'e ne kadar surede ulasilacagi dogrusal projeksiyonla hesaplanir:
  `estimatedMinutesToCritical = (70 - currentClogging) / (cloggingDiffPerSecond * 60)`
- Bu bilgi gosterge panelinde "Kestirimci Bakim: ~X.X dk" seklinde erken uyari olarak sunulur.

---

## 2. API Ucbirimi (REST Endpoints)

- `GET  /api/sensor/health` : Sunucu ve servis saglik kontrolu.
- `POST /api/sensor` : Sensor veya simulatorden yeni olcum paketi alir (ValidationPipe ile dogrulanir).
- `GET  /api/sensor?limit=20` : Dashboard grafigi icin en guncel olcumleri listeler.
- `GET  /api/sensor/failures?limit=100` : Yalnizca kritik ve uyari olusmus ariza kayitlarini listeler.
- `GET  /api/sensor/summary` : Anlik durum, toplam kayit ve kritik sayaclari ozetler.

---

## 3. Kurulum ve Calistirma Kilavuzu

### Hizli Baslatma (Tek Tikla)
Tum sistemi tek seferde ayaga kaldirmak icin proje ana dizinindeki **`start_all.bat`** dosyasini cift tiklayarak calistirabilirsiniz. Backend, Frontend ve Sensor Simulatoru ayri pencerelerde otomatik baslatilir ve tarayicida dashboard acilir. Servisleri durdurmak icin acilan konsol pencerelerini kapatmaniz yeterlidir.

### Manuel Calistirma Adimlari

### Gereksinimler
- Node.js: v20 veya uzeri (Onerilen: v22/v24)
- Python: 3.8 veya uzeri
- PostgreSQL (Veya hazir .env icindeki bulut Neon PostgreSQL baglantisi)

### 3.1. Backend Kurulumu (NestJS)
```bash
cd filtration-backend
npm install
npm run build
npm run start:dev
```
Sunucu `http://localhost:3000` portunda baslatilir.

### 3.2. Frontend Kurulumu (React + Vite)
```bash
cd filtration-frontend
npm install
npm run build
npm run dev
```
Uygulama `http://localhost:5173` adresinde acilir.

### 3.3. Sensor Simulatoru (Python)
Ana dizinde yer alan `sensor-bot.py` dosyasini calistirin:
```bash
python sensor-bot.py
```
Simulator her 2 saniyede bir olcum paketini backend'e gonderir ve terminalde durum ozeti basar.

---

## 4. Demo Kontrol Listesi (Checklist)

- [x] Backend `.env` yapilandirmasi guvenli hale getirildi.
- [x] DTO giris dogrulamasi (`class-validator`) eklendi.
- [x] 3 seviyeli durum mantigi (Normal, Uyari, Kritik) aktif.
- [x] Kestirimci bakim trend analizi eklendi.
- [x] Socket.io anlik veri senkronizasyonu calisiyor.
- [x] Dashboard uzerinde baglanti ve son veri zaman sayaci eklendi.
- [x] Grafik uzerinde referans esik cizgileri (%70 ve %20) konumlandirildi.
- [x] Tum gecmis ariza arsivi icin veritabanindan tek tikla CSV export eklendi.
- [x] Tum arayuz ve konsol ciktilari emojilerden arindirildi, endustriyel tasarim uygulandi.
- [x] Vitest birim testleri hatasiz sekilde calisiyor.