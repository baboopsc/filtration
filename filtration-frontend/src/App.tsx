import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Download,
  Droplets,
  Filter,
  Clock,
  Cpu,
  RefreshCw,
  ShieldAlert,
  Gauge,
  TrendingUp,
} from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:3000';

export interface SensorData {
  id: number;
  deviceId?: string;
  waterLevel: number;
  filterClogging: number;
  flowRate?: number | null;
  status?: 'NORMAL' | 'WARNING' | 'CRITICAL';
  isSystemHealthy: boolean;
  alertReason?: string;
  estimatedMinutesToCritical?: number | null;
  recordedAt: string;
}

function App() {
  const [data, setData] = useState<SensorData[]>([]);
  const [failures, setFailures] = useState<SensorData[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [lastDataTimestamp, setLastDataTimestamp] = useState<number | null>(null);
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [isLoadingAllFailures, setIsLoadingAllFailures] = useState(false);

  const loadInitialData = async () => {
    try {
      const [historyRes, failuresRes] = await Promise.all([
        axios.get<SensorData[]>(`${API_BASE_URL}/api/sensor?limit=20`),
        axios.get<SensorData[]>(`${API_BASE_URL}/api/sensor/failures?limit=50`),
      ]);

      setIsBackendConnected(true);
      const sortedHistory = [...historyRes.data].reverse();
      setData(sortedHistory);
      setFailures(failuresRes.data);

      if (sortedHistory.length > 0) {
        setLastDataTimestamp(Date.now());
      }
    } catch (err) {
      console.error('Backend bağlantı hatası:', err);
      setIsBackendConnected(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    const socket: Socket = io(API_BASE_URL, {
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      setIsSocketConnected(true);
      setIsBackendConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    socket.on('yeniSensorVerisi', (yeniVeri: SensorData) => {
      setIsBackendConnected(true);
      setLastDataTimestamp(Date.now());

      setData((prev) => {
        const next = [...prev, yeniVeri];
        return next.slice(-20);
      });

      const isCriticalOrWarning =
        yeniVeri.status === 'CRITICAL' ||
        yeniVeri.status === 'WARNING' ||
        !yeniVeri.isSystemHealthy;

      if (isCriticalOrWarning) {
        setFailures((prev) => [yeniVeri, ...prev.slice(0, 99)]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastDataTimestamp) {
        const diff = Math.floor((Date.now() - lastDataTimestamp) / 1000);
        setSecondsAgo(diff);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastDataTimestamp]);

  const latest = data.length > 0 ? data[data.length - 1] : null;

  const currentStatus = useMemo(() => {
    if (!latest) return 'NORMAL';
    if (latest.status) return latest.status;
    if (!latest.isSystemHealthy) return 'CRITICAL';
    if (latest.filterClogging >= 50 || latest.waterLevel <= 30) return 'WARNING';
    return 'NORMAL';
  }, [latest]);

  const filteredFailures = useMemo(() => {
    if (filterType === 'ALL') return failures;
    if (filterType === 'CRITICAL') {
      return failures.filter((f) => f.status === 'CRITICAL' || !f.isSystemHealthy);
    }
    if (filterType === 'WARNING') {
      return failures.filter((f) => f.status === 'WARNING');
    }
    return failures;
  }, [failures, filterType]);

  const exportToCsv = (records: SensorData[], filenamePrefix: string) => {
    if (!records || records.length === 0) {
      alert('Dışa aktarılacak arıza kaydı bulunmuyor.');
      return;
    }

    let csvContent = '\uFEFFTarih;Saat;Cihaz;Su Seviyesi (%);Filtre Tıkanıklığı (%);Debi (L/dk);Durum;Olay Açıklaması\n';

    records.forEach((row) => {
      const d = new Date(row.recordedAt);
      const dateStr = d.toLocaleDateString('tr-TR');
      const timeStr = d.toLocaleTimeString('tr-TR');
      const device = row.deviceId || 'SENSOR-01';
      const statusLabel =
        row.status === 'CRITICAL' || !row.isSystemHealthy
          ? 'Kritik Durum'
          : row.status === 'WARNING'
          ? 'Uyarı'
          : 'Normal';
      const reason = (row.alertReason || 'Belirtilmedi').replace(/;/g, ',');
      const flow = row.flowRate !== undefined && row.flowRate !== null ? row.flowRate : '-';

      csvContent += `="${dateStr}";="${timeStr}";"${device}";${row.waterLevel};${row.filterClogging};${flow};"${statusLabel}";"${reason}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullReport = async () => {
    try {
      setIsLoadingAllFailures(true);
      const res = await axios.get<SensorData[]>(`${API_BASE_URL}/api/sensor/failures?limit=500`);
      exportToCsv(res.data, 'Filtrasyon_Ariza_Arsivi');
    } catch (err) {
      console.error('Arşiv indirilirken hata:', err);
      alert('Rapor veritabanından çekilirken bağlantı hatası oluştu.');
    } finally {
      setIsLoadingAllFailures(false);
    }
  };

  const handleDownloadCurrentView = () => {
    exportToCsv(filteredFailures, 'Filtrasyon_Goruntulenen_Olaylar');
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-title-group">
          <h1>Akıllı Su Filtrasyon İzleme ve Erken Uyarı Sistemi</h1>
          <p>IoT Telemetri Akışı, Kural Tabanlı Güvenlik ve Kestirimci Bakım Paneli</p>
        </div>

        <div className="header-status-group">
          <div
            className={`status-badge ${
              isBackendConnected ? 'badge-connected' : 'badge-disconnected'
            }`}
          >
            <span
              className={`pulse-dot ${isBackendConnected ? 'online' : 'offline'}`}
            />
            <span>
              Backend: {isBackendConnected ? 'Çevrimiçi' : 'Bağlantı Yok'}
            </span>
          </div>

          <div
            className={`status-badge ${
              isSocketConnected ? 'badge-connected' : 'badge-disconnected'
            }`}
          >
            <Activity size={14} />
            <span>
              Telemetri: {isSocketConnected ? 'Canlı Akış Aktif' : 'Bekleniyor'}
            </span>
          </div>

          <div className="status-badge badge-neutral">
            <Clock size={14} />
            <span>
              Son Ölçüm:{' '}
              {secondsAgo !== null
                ? secondsAgo <= 1
                  ? 'Şimdi'
                  : `${secondsAgo} sn önce`
                : 'Veri bekleniyor'}
            </span>
          </div>

          <button
            onClick={loadInitialData}
            className="btn btn-outline"
            style={{ padding: '0.35rem 0.6rem' }}
            title="Verileri ve bağlantıyı yenile"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* METRİK KARTLARI */}
      <section className="metrics-grid">
        {/* KART 1: SİSTEM DURUMU */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-title">Sistem Durumu</span>
            <div className="metric-icon-wrap">
              {currentStatus === 'CRITICAL' ? (
                <ShieldAlert size={18} color="#ef4444" />
              ) : currentStatus === 'WARNING' ? (
                <AlertTriangle size={18} color="#f59e0b" />
              ) : (
                <CheckCircle2 size={18} color="#10b981" />
              )}
            </div>
          </div>
          <div className="metric-value-row">
            <span
              className="metric-number"
              style={{
                color:
                  currentStatus === 'CRITICAL'
                    ? '#ef4444'
                    : currentStatus === 'WARNING'
                    ? '#f59e0b'
                    : '#10b981',
                fontSize: '1.45rem',
              }}
            >
              {currentStatus === 'CRITICAL'
                ? 'Kritik Durum'
                : currentStatus === 'WARNING'
                ? 'Dikkat / Uyarı'
                : 'Normal Çalışma'}
            </span>
          </div>
          <div className="metric-subtext">
            {currentStatus === 'CRITICAL'
              ? 'Acil bakım veya filtre değişimi gerekiyor'
              : currentStatus === 'WARNING'
              ? 'Eşik yaklaşımı, filtre kontrol edilmeli'
              : 'Tüm parametreler güvenli aralıkta'}
          </div>
        </div>

        {/* KART 2: FİLTRE TIKANIKLIĞI */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-title">Filtre Tıkanıklığı</span>
            <div className="metric-icon-wrap">
              <Filter size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">
              %{latest ? Number(latest.filterClogging).toFixed(1) : '0.0'}
            </span>
            <span className="metric-unit">Eşik: %70</span>
          </div>
          <div className="progress-container">
            <div
              className={`progress-fill ${
                (latest?.filterClogging ?? 0) >= 70
                  ? 'fill-red'
                  : (latest?.filterClogging ?? 0) >= 50
                  ? 'fill-amber'
                  : 'fill-green'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, latest?.filterClogging ?? 0))}%`,
              }}
            />
          </div>
          <div className="metric-subtext">
            {(latest?.filterClogging ?? 0) >= 70
              ? 'Kritik sınır aşıldı (%70 üzeri)'
              : (latest?.filterClogging ?? 0) >= 50
              ? 'Tıkanma hızı artıyor'
              : 'Filtre geçirgenliği optimum'}
          </div>
        </div>

        {/* KART 3: SU SEVİYESİ */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-title">Su Seviyesi</span>
            <div className="metric-icon-wrap">
              <Droplets size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">
              %{latest ? Number(latest.waterLevel).toFixed(1) : '0.0'}
            </span>
            <span className="metric-unit">Kritik: %20</span>
          </div>
          <div className="progress-container">
            <div
              className={`progress-fill ${
                (latest?.waterLevel ?? 100) <= 20
                  ? 'fill-red'
                  : (latest?.waterLevel ?? 100) <= 30
                  ? 'fill-amber'
                  : 'fill-blue'
              }`}
              style={{
                width: `${Math.min(100, Math.max(0, latest?.waterLevel ?? 0))}%`,
              }}
            />
          </div>
          <div className="metric-subtext">
            {(latest?.waterLevel ?? 100) <= 20
              ? 'Depo seviyesi yetersiz, besleme yapınız'
              : (latest?.waterLevel ?? 100) <= 30
              ? 'Depo seviyesi düşük'
              : 'Yeterli rezerv mevcut'}
          </div>
        </div>

        {/* KART 4: AKIŞ DEBİSİ */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-title">Su Akış Debisi</span>
            <div className="metric-icon-wrap">
              <Gauge size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">
              {latest?.flowRate !== undefined && latest?.flowRate !== null
                ? Number(latest.flowRate).toFixed(2)
                : Number(Math.max(0.2, 5.0 * (1 - (latest?.filterClogging ?? 0) / 100))).toFixed(2)}
            </span>
            <span className="metric-unit">L/dk</span>
          </div>
          <div className="metric-subtext" style={{ marginTop: '0.4rem' }}>
            Nominal debi: 5.00 L/dk — Akış hızı filtre tıkanıklığı ile ters orantılıdır
          </div>
        </div>

        {/* KART 5: KEStirimci BAKIM */}
        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-title">Kestirimci Bakım</span>
            <div className="metric-icon-wrap">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span
              className="metric-number"
              style={{ fontSize: '1.45rem', color: '#0f172a' }}
            >
              {latest && latest.filterClogging >= 70
                ? 'Bakım Gerekli'
                : latest?.estimatedMinutesToCritical !== null &&
                  latest?.estimatedMinutesToCritical !== undefined
                ? `~${latest.estimatedMinutesToCritical} dk`
                : 'Trend Dengeli'}
            </span>
          </div>
          <div className="metric-subtext">
            {latest && latest.filterClogging >= 70
              ? 'Filtre şu anda tıkanık durumda'
              : latest?.estimatedMinutesToCritical
              ? 'Mevcut artış ivmesiyle %70 eşiğine tahmini varış süresi'
              : 'Son ölçümlerde kritik yükseliş ivmesi tespit edilmedi'}
          </div>
        </div>
      </section>

      {/* KRİTİK / UYARI BİLDİRİM PANELİ */}
      {latest && (currentStatus === 'CRITICAL' || currentStatus === 'WARNING') && (
        <section
          className={`alert-banner ${
            currentStatus === 'CRITICAL' ? 'critical' : 'warning'
          }`}
        >
          <div className="alert-icon-box">
            {currentStatus === 'CRITICAL' ? (
              <ShieldAlert size={24} color="#ef4444" />
            ) : (
              <AlertTriangle size={24} color="#f59e0b" />
            )}
          </div>
          <div className="alert-content">
            <h4>
              {currentStatus === 'CRITICAL'
                ? 'Kritik Sistem Uyarısı — İşlemsel Müdahale Gerekli'
                : 'Dikkat Uyarısı — Parametre Değişimi Tespit Edildi'}
            </h4>
            <p>
              {latest.alertReason ||
                (currentStatus === 'CRITICAL'
                  ? 'Filtre tıkanıklığı veya su seviyesi güvenli tolerans dışına çıktı.'
                  : 'Filtre tıkanıklığı artış gösteriyor.')}
            </p>
          </div>
        </section>
      )}

      {/* CANLI TELEMETRİ GRAFİĞİ */}
      <section className="chart-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Canlı Telemetri Grafiği</h2>
            <p className="section-subtitle">
              Son 20 ölçümün su seviyesi ve filtre tıkanıklık değişim eğrisi
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span className="status-badge badge-neutral" style={{ fontSize: '0.75rem' }}>
              <Cpu size={12} /> Cihaz: {latest?.deviceId || 'SENSOR-01'}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="recordedAt"
                tickFormatter={(val) => {
                  try {
                    return new Date(val).toLocaleTimeString('tr-TR');
                  } catch {
                    return val;
                  }
                }}
                stroke="#64748b"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Yüzde (%)',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: '#64748b', fontSize: 12 },
                }}
              />
              <Tooltip
                labelFormatter={(label: any) => {
                  try {
                    return new Date(label).toLocaleString('tr-TR');
                  } catch {
                    return String(label ?? '');
                  }
                }}
                formatter={(value: any, name: any) => [
                  `%${Number(value).toFixed(1)}`,
                  name,
                ]}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '0.85rem',
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '12px', fontSize: '0.85rem' }}
              />

              <ReferenceLine
                y={70}
                label={{
                  value: 'Kritik Tıkanıklık Eşiği (%70)',
                  fill: '#ef4444',
                  fontSize: 11,
                  position: 'top',
                }}
                stroke="#ef4444"
                strokeDasharray="4 4"
              />
              <ReferenceLine
                y={20}
                label={{
                  value: 'Kritik Su Eşiği (%20)',
                  fill: '#3b82f6',
                  fontSize: 11,
                  position: 'bottom',
                }}
                stroke="#3b82f6"
                strokeDasharray="4 4"
              />

              <Line
                type="monotone"
                dataKey="waterLevel"
                name="Su Seviyesi (%)"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="filterClogging"
                name="Filtre Tıkanıklığı (%)"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* GEÇMİŞ ARIZA VE OLAY KAYITLARI */}
      <section className="table-card">
        <div className="section-header">
          <div>
            <h2 className="section-title">Geçmiş Arıza ve Olay Kayıtları</h2>
            <p className="section-subtitle">
              Kritik eşik aşımları, uyarılar ve filtre müdahale logları
            </p>
          </div>

          <div className="action-button-group">
            <div style={{ display: 'flex', gap: '0.25rem', marginRight: '0.5rem' }}>
              <button
                className={`btn-filter ${filterType === 'ALL' ? 'active' : ''}`}
                onClick={() => setFilterType('ALL')}
              >
                Tümü ({failures.length})
              </button>
              <button
                className={`btn-filter ${filterType === 'CRITICAL' ? 'active' : ''}`}
                onClick={() => setFilterType('CRITICAL')}
              >
                Kritik (
                {failures.filter((f) => f.status === 'CRITICAL' || !f.isSystemHealthy).length}
                )
              </button>
              <button
                className={`btn-filter ${filterType === 'WARNING' ? 'active' : ''}`}
                onClick={() => setFilterType('WARNING')}
              >
                Uyarı ({failures.filter((f) => f.status === 'WARNING').length})
              </button>
            </div>

            <button
              onClick={handleDownloadCurrentView}
              className="btn btn-outline"
              title="Yalnızca şu an ekranda görüntülenen kayıtları CSV olarak indirir"
            >
              <Download size={14} />
              Görüntülenenleri İndir
            </button>

            <button
              onClick={handleDownloadFullReport}
              disabled={isLoadingAllFailures}
              className="btn btn-primary"
              title="Veritabanındaki tüm arıza geçmişini çeker ve indirir"
            >
              <Download size={14} />
              {isLoadingAllFailures ? 'Hazırlanıyor...' : 'Tüm Raporu İndir (Veritabanı)'}
            </button>
          </div>
        </div>

        {filteredFailures.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon-wrap">
              <CheckCircle2 size={24} />
            </div>
            <h4>Kaydedilmiş Arıza Bulunmuyor</h4>
            <p>
              Seçili filtreye uygun kritik durum veya sistem uyarısı kaydı yoktur.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Saat</th>
                  <th>Cihaz</th>
                  <th>Su Seviyesi</th>
                  <th>Filtre Tıkanıklığı</th>
                  <th>Akış Debisi</th>
                  <th>Durum</th>
                  <th>Olay / Uyarı Gerekçesi</th>
                </tr>
              </thead>
              <tbody>
                {filteredFailures.map((item) => {
                  const dateObj = new Date(item.recordedAt);
                  const isCrit = item.status === 'CRITICAL' || !item.isSystemHealthy;
                  const flowDisplay =
                    item.flowRate !== undefined && item.flowRate !== null
                      ? `${Number(item.flowRate).toFixed(2)} L/dk`
                      : '-';

                  return (
                    <tr key={item.id}>
                      <td style={{ color: '#64748b' }}>
                        {dateObj.toLocaleDateString('tr-TR')}
                      </td>
                      <td style={{ color: '#64748b', fontFamily: 'monospace' }}>
                        {dateObj.toLocaleTimeString('tr-TR')}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {item.deviceId || 'SENSOR-01'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#0284c7' }}>
                        %{Number(item.waterLevel).toFixed(1)}
                      </td>
                      <td style={{ fontWeight: 600, color: isCrit ? '#ef4444' : '#f59e0b' }}>
                        %{Number(item.filterClogging).toFixed(1)}
                      </td>
                      <td style={{ color: '#475569' }}>{flowDisplay}</td>
                      <td>
                        <span className={`tag ${isCrit ? 'tag-critical' : 'tag-warning'}`}>
                          {isCrit ? 'Kritik Durum' : 'Uyarı'}
                        </span>
                      </td>
                      <td style={{ color: '#334155' }}>
                        {item.alertReason || 'Eşik değeri aşıldı'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <div>
          <span>Akıllı Su Filtrasyon ve Erken Uyarı Sistemi</span>
        </div>
        <div>
          <span>Tekstil ve Bilgisayar Mühendisliği Disiplinlerarası Bitirme Projesi</span>
        </div>
      </footer>
    </div>
  );
}

export default App;