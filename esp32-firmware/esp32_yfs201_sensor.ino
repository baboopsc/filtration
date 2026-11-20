/*
 * Akilli Su Filtrasyon ve Kestirimci Bakim Sistemi
 * ESP32 DevKit + YF-S201 (1/2 inc) Hall-Effect Su Akis Sensoru Firmware
 *
 * Hidrolik Kurgu (Cift Besleme / Dual-Feed):
 * - Hat 1 (Temiz Su Kalibrasyonu) -> Vana 1 acik iken 'BOOT' butonuna uzun bas (>=1.5 sn) -> Q_nominal kaydedilir
 * - Hat 2 (Partikullu Su Deneyi)  -> Vana 2 acik iken tikanma ve debi dususu izlenir
 * - 5L Bidon Doldugunda          -> 'BOOT' butonuna kisa bas (<1.5 sn) -> waterLevel %100'e sifirlanir
 *
 * Donanim Baglantisi:
 * - YF-S201 Kirmizi (VCC)  -> 5V (VIN / Harici 5V)
 * - YF-S201 Siyah   (GND)  -> GND (Ortak toprak)
 * - YF-S201 Sari    (DATA) -> GPIO 27 (ESP32 GPIO pinleri 3.3V toleransli oldugu icin
 *                             DATA hattinda 10k + 20k direnc gerilim bolucu kullanin)
 * - Dahili BOOT Butonu     -> GPIO 0 (Aktif LOW; sahada bilgisayarsiz sifirlama ve kalibrasyon)
 *
 * Seri Monitor Komutlari (115200 baud):
 * - 'r' : 5 litrelik besleme bidonu dolduruldugunda hacim sayacini (%100) sifirlar
 * - 'c' : Temiz filtre akisindaki anlik debiyi yeni nominal debi (Q_nominal) olarak kaydeder
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ---------------- AG VE SUNUCU AYARLARI ----------------
const char* WIFI_SSID     = "WIFI_ADINIZ";
const char* WIFI_PASSWORD = "WIFI_SIFRENIZ";
const char* SERVER_URL    = "http://192.168.1.100:3000/api/sensor"; // Bilgisayarinizin yerel IP adresini yazin
const char* DEVICE_ID     = "ESP32-YFS201-01";

// ---------------- DONANIM VE FIZIKSEL PARAMETRELER ----------------
const int   FLOW_SENSOR_PIN     = 27;
const int   BOOT_BUTTON_PIN     = 0;       // ESP32 DevKit dahili BOOT butonu (INPUT_PULLUP)
const float CALIBRATION_FACTOR  = 7.5f;    // YF-S201: F(Hz) = 7.5 * Q(L/dk)
const float MIN_VALID_FLOW_LPM  = 0.8f;    // YF-S201 turbin baslangic esigi (~1.0 L/dk alti kararsiz)
const float TANK_CAPACITY_L     = 5.0f;    // 5 litrelik besleme bidonu
const unsigned long INTERVAL_MS = 2000;    // 2 saniyelik telemetri periyodu
const unsigned long LONG_PRESS_MS = 1500;  // Uzun basis kalibrasyon suresi

float nominalFlowLpm       = 5.0f;         // Temiz tekstil filtre referans debisi (L/dk)
float consumedLiters       = 0.0f;         // 5L bidondan gecen toplam su hacmi (L)
float lastMeasuredFlowRate = 0.0f;         // Son olculen anlik debi (L/dk)
bool  hasFlowStarted       = false;        // Pompa baslatildi mi?

// Buton durum takibi
bool buttonWasPressed = false;
unsigned long buttonPressStart = 0;

volatile unsigned long pulseCount = 0;
portMUX_TYPE mux = portMUX_INITIALIZER_UNLOCKED;

unsigned long lastMeasureTime = 0;

void IRAM_ATTR pulseCounter() {
  portENTER_CRITICAL_ISR(&mux);
  pulseCount++;
  portEXIT_CRITICAL_ISR(&mux);
}

void resetTankVolume() {
  consumedLiters = 0.0f;
  hasFlowStarted = false;
  Serial.println("[SIFIRLAMA] 5.0 L besleme bidonu doluluk sayaci %100 olarak sifirlandi.");
}

void calibrateNominalFlow(float flowToSave) {
  if (flowToSave >= MIN_VALID_FLOW_LPM) {
    nominalFlowLpm = flowToSave;
    Serial.printf("[KALIBRASYON] Yeni nominal temiz filtre debisi kaydedildi: %.2f L/dk\n", nominalFlowLpm);
  } else {
    Serial.println("[KALIBRASYON] Gecerli debi yok (YF-S201 icin >= 0.8-1.0 L/dk temiz su akisi baslatin).");
  }
}

void handleBootButton() {
  bool isPressed = (digitalRead(BOOT_BUTTON_PIN) == LOW);
  if (isPressed && !buttonWasPressed) {
    buttonWasPressed = true;
    buttonPressStart = millis();
  } else if (!isPressed && buttonWasPressed) {
    unsigned long pressDuration = millis() - buttonPressStart;
    buttonWasPressed = false;
    if (pressDuration >= 50 && pressDuration < LONG_PRESS_MS) {
      resetTankVolume();
    } else if (pressDuration >= LONG_PRESS_MS) {
      calibrateNominalFlow(lastMeasuredFlowRate);
    }
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("[WIFI] Baglaniliyor: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.print("[WIFI] Baglandi. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n[UYARI] Wi-Fi baglantisi kurulamadi, sonraki periyotta tekrar denenecek.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BOOT_BUTTON_PIN, INPUT_PULLUP);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, RISING);

  Serial.println("=== Akilli Su Filtrasyon ESP32 + YF-S201 Baslatildi ===");
  Serial.println("Fiziksel BOOT (GPIO 0): Kisa bas = 5L Bidon Sifirla | Uzun bas (>=1.5s) = Temiz Su Kalibrasyonu");
  Serial.println("Seri Komutlar: 'r' = 5L Bidon Sifirla | 'c' = Temiz Su Debisini Kalibre Et");

  connectWiFi();
  lastMeasureTime = millis();
}

void loop() {
  // Sahada bilgisayarsiz sifirlama/kalibrasyon icin dahili BOOT butonunu izle
  handleBootButton();

  // Seri port uzerinden kullanici komutlarini dinle
  if (Serial.available() > 0) {
    char cmd = Serial.read();
    if (cmd == 'r' || cmd == 'R') {
      resetTankVolume();
    } else if (cmd == 'c' || cmd == 'C') {
      calibrateNominalFlow(lastMeasuredFlowRate);
    }
  }

  unsigned long now = millis();
  if (now - lastMeasureTime < INTERVAL_MS) {
    return;
  }

  float elapsedSec = (now - lastMeasureTime) / 1000.0f;
  lastMeasureTime = now;

  // Kesme sayacini guvenli sekilde oku ve sifirla
  unsigned long currentPulses = 0;
  portENTER_CRITICAL(&mux);
  currentPulses = pulseCount;
  pulseCount = 0;
  portEXIT_CRITICAL(&mux);

  // Anlik debi hesabi (L/dk): Frekans = pulses / elapsedSec; Q = Frekans / 7.5
  float frequencyHz = currentPulses / elapsedSec;
  float flowRate = frequencyHz / CALIBRATION_FACTOR;
  lastMeasuredFlowRate = flowRate;

  if (flowRate >= 0.05f) {
    hasFlowStarted = true;
  }

  // 5L bidondan gecen kumulatif hacmi ekle
  float deltaLiters = flowRate * (elapsedSec / 60.0f);
  consumedLiters = min(TANK_CAPACITY_L, consumedLiters + deltaLiters);

  float waterLevel = ((TANK_CAPACITY_L - consumedLiters) / TANK_CAPACITY_L) * 100.0f;
  if (waterLevel < 0.0f) waterLevel = 0.0f;
  if (waterLevel > 100.0f) waterLevel = 100.0f;

  // Debi dususunden filtre tikanikligi (%) hesapla
  float filterClogging = 0.0f;
  if (hasFlowStarted && nominalFlowLpm > 0.0f) {
    filterClogging = (1.0f - (flowRate / nominalFlowLpm)) * 100.0f;
    if (filterClogging < 0.0f) filterClogging = 0.0f;
    if (filterClogging > 100.0f) filterClogging = 100.0f;
  }

  Serial.printf(
    "[OLCUM] Debi: %.2f L/dk | Su: %% %.1f (%.2f L kaldi) | Tikaniklik: %% %.1f\n",
    flowRate,
    waterLevel,
    TANK_CAPACITY_L - consumedLiters,
    filterClogging
  );

  // Backend API'ye JSON gonder
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    String payload = String("{\"deviceId\":\"") + DEVICE_ID +
                     "\",\"waterLevel\":" + String(waterLevel, 1) +
                     ",\"filterClogging\":" + String(filterClogging, 1) +
                     ",\"flowRate\":" + String(flowRate, 2) + "}";

    int httpCode = http.POST(payload);
    if (httpCode > 0) {
      Serial.printf("[API] HTTP %d gonderildi.\n", httpCode);
    } else {
      Serial.printf("[HATA] HTTP gonderim hatasi: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  }
}
