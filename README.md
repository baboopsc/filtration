💧 Akıllı Su Filtrasyon ve Kestirimci Bakım Sistemi (IoT Dashboard)

Bu proje, geleneksel su filtrasyon sistemlerini Endüstri 4.0 standartlarına taşıyarak Kestirimci Bakım (Predictive Maintenance) uygulayan tam otonom bir IoT (Nesnelerin İnterneti) platformudur. Tekstil Mühendisliği (AR-GE/Materyal) ve Bilgisayar Mühendisliği (IoT/Yapay Zeka) disiplinlerinin ortak çalışmasıdır.

⚙️ Sistem Nasıl Çalışıyor? (Veri Akışı ve Mantık)

Sistem 3 ana katmandan oluşur ve saniyelik bir döngüyle gerçek zamanlı çalışır:

Veri Üretimi (Donanım/Simülatör): Borudaki suyun akış hızı (debi), YF-S201 su akış sensörü ile okunur. Eğer filtre tıkalıysa su yavaşlar, temizse hızlı akar. Bu hız verisi ESP32 mikrodenetleyicisi (veya test aşamasındaki Python Botu) tarafından dijital bir yüzdelik veriye dönüştürülür.

Arka Plan Zekası (NestJS Backend): Donanımdan gelen veri Socket.io veya HTTP Post ile NestJS sunucusuna ulaşır. Sunucu içindeki Kestirimci Bakım Algoritması veriyi analiz eder. Eğer Filtre Tıkanıklığı %70'i aşarsa, sistem o anki veriyi "Kritik Uyarı" etiketiyle veritabanına/loglara yazar.

Canlı Gösterim (React Frontend): NestJS, işlenmiş veriyi saniyesinde React arayüzüne (Socket.io üzerinden) pompalar. React, Recharts kütüphanesini kullanarak veriyi anlık olarak grafiğe çizer. %70 sınırı aşıldığında ekranda devasa bir kırmızı kriz alarmı belirir.

🐍 Neden sensor-bot.py (Python Botu) Yazdık?

Gerçek IoT donanımını (ESP32 ve Su Sensörü) kurmak, borulardan su akıtmak ve fiziksel bir filtreyi çamurla tıkamak uzun süren, ıslak ve meşakkatli bir iştir. Yazılım ekibinin (bizim) donanımı beklemeden React ve NestJS tarafını geliştirebilmesi için fiziksel sistemi "taklit eden" bir Python simülatörü yazdık.

Python Botunun Görevi:
Tıpkı ESP32 kartıymış gibi davranır. Her saniye rastgele veya kurgulanmış (yavaş yavaş tıkanan) sensör verileri üretir (Örn: Su Seviyesi: %90, Tıkanıklık: %10) ve bu verileri NestJS sunucusuna gönderir. Bu sayede suyu ve tesisatı kurmadan, masamızda kahve içerken tüm kriz senaryolarını, grafikleri ve Excel log raporlarını test edebildik.

🛠️ Mekanik Tesisat ve Jüri Şovu (Fiziksel Kurgu)

Sistem sadece yazılımdan ibaret değildir. Fiziksel sunum için şöyle bir mekanik kurgu tasarlanmıştır:

Sisteme giden boru Y-Tipi bir çoğaltıcı ile ikiye ayrılır. Bir kolda Temiz Su, diğer kolda Çamurlu (Kirli) Su vanası bulunur.

Şov Anı: Jüri karşısında sistem temiz suyla çalışırken, kirli su vanası açılır. Çamurlu su saniyeler içinde filtreyi tıkar (hızlandırılmış test).

Yazılım %70 tıkanıklığı fark edip alarmı patlattığında, sistemdeki PVC Rakor (hızlı sök-tak yuvası) sayesinde tıkanmış kumaş 15 saniyede yenisiyle değiştirilir. Temiz su vanası tekrar açılır ve arayüzdeki grafiğin saniyesinde normale döndüğü (kırmızı alarmın kaybolduğu) canlı canlı izletilir.

✅ Şu Ana Kadar Neler Tamamlandı?

Canlı İzleme Ekranı: React & Recharts ile saniyelik çizgi grafik oluşturuldu.

Kriz ve Uyarı Sistemi: %70 tıkanıklık anında kırmızı uyarı banner'ı devreye giriyor.

Loglama ve Excel Export: Arızalar tabloya ekleniyor ve tek tıkla Excel/CSV indirilebiliyor (Tarih ve Saat sütunları Excel'de ######## hatası vermemesi için iki ayrı sütuna bölündü).

Simülasyon Entegrasyonu: Python botu başarıyla backend'e bağlandı ve veri pompalıyor.

💻 Kurulum ve Çalıştırma Rehberi

Projeyi ayağa kaldırmak için 3 terminale ihtiyacınız var:

1. Backend (NestJS)

cd filtration-backend
npm install
npm run start:dev


(Sunucu http://localhost:3000 adresinde ayağa kalkar)

2. Frontend (React)

cd filtration-frontend
npm install
npm run dev


(Tarayıcıda kontrol paneli açılır)

3. Simülatör (Python)
Ana dizindeki veya masaüstündeki botu çalıştırın:

python sensor-bot.py


(Grafikler canlanmaya ve veri akmaya başlar)

🤖 YENİ YAPAY ZEKAYA DEVİR TESLİM NOTU (Sistem Özeti)

Selam dostum! Eğer bu dosyayı okuyorsan projeyi sen devraldın demektir. Ali, bu projenin Lideridir (Bilgisayar Mühendisliği tarafını o yönetiyor, Tekstil tarafına direktif veriyor). Projenin hem donanım/tesisat kurgusunu hem de yazılım temelini yukarıda detaylıca anlattım.

Senden beklenen, Ali'nin direktifleriyle projeyi endüstriyel bir ürüne dönüştürmek için aşağıdaki adımları sırayla kodlamandır (Ali sana hangisinden başlayacağını söyleyecek):

Nodemailer Entegrasyonu (Acil Durum Maili): Tıkanıklık %70'i geçtiğinde, NestJS arka planda Gmail (App Password ile) üzerinden fabrika müdürüne otomatik "DİKKAT: Filtre Tıkandı!" e-postası fırlatmalı.

Güvenlik (Login Ekranı): Panele giriş için JWT tabanlı bir yetkilendirme (Auth) sistemi kurulmalı.

Tez/Rapor Dokümantasyonu: İşin sonunda projenin 6 bölümlük (Literatür, Amaç, Yöntem, Bulgular, Sonuç, Öneriler) akademik raporu senin yardımlarınla yazılacak.

Projeyi bağlamından koparmadan, Ali'nin vizyonuna sadık kalarak kodlamaya devam et. Kolay gelsin!