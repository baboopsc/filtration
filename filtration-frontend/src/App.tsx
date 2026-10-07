import { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const socket = io('http://localhost:3000');

interface SensorData {
  id: number;
  waterLevel: number;
  filterClogging: number;
  isSystemHealthy: boolean;
  recordedAt: string;
}

function App() {
  const [data, setData] = useState<SensorData[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/sensor');
        setData(response.data.reverse());
      } catch (error) {
        console.error('Veri çekilirken hata oluştu:', error);
      }
    };
    fetchInitialData();

    socket.on('yeniSensorVerisi', (yeniVeri: SensorData) => {
      setData((prevData) => {
        const guncelListe = [...prevData, yeniVeri];
        return guncelListe.slice(-20);
      });
    });

    return () => {
      socket.off('yeniSensorVerisi');
    };
  }, []);

  const sonVeri = data.length > 0 ? data[data.length - 1] : null;
  const arizaKayitlari = data.filter(d => !d.isSystemHealthy).reverse();

  // EXCEL / CSV İNDİRME FONKSİYONU
  const raporuIndir = () => {
    if (arizaKayitlari.length === 0) {
      alert("İndirilecek arıza kaydı bulunmuyor!");
      return;
    }

    // Excel başlıklarını Tarih ve Saat olarak ikiye böldük
    let csvIcerik = "\uFEFFTarih;Saat;Su Seviyesi (%);Filtre Tikanikligi (%);Durum\n";
    
    arizaKayitlari.forEach(kayit => {
      const dateObj = new Date(kayit.recordedAt);
      const tarih = dateObj.toLocaleDateString('tr-TR');
      const saat = dateObj.toLocaleTimeString('tr-TR');
      
      // ="" mantığı ile Excel'i kandırıp verileri metin olarak okutuyoruz (######## hatasını engeller)
      csvIcerik += `="${tarih}";="${saat}";${kayit.waterLevel};${kayit.filterClogging};Kritik Uyari\n`;
    });

    // Dosyayı oluştur ve tarayıcıda indirmeyi tetikle
    const blob = new Blob([csvIcerik], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Filtre_Ariza_Raporu_${new Date().toLocaleDateString('tr-TR')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h2 style={{ color: '#0f172a' }}>💧 Akıllı Su Filtrasyon Sistemi - Canlı İzleme</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Socket.io ile Endüstriyel Gerçek Zamanlı (Real-Time) Veri Akışı</p>
      
      {sonVeri && !sonVeri.isSystemHealthy && (
        <div style={{ width: '800px', backgroundColor: '#fee2e2', border: '2px solid #ef4444', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 6px -1px rgb(239 68 68 / 0.2)' }}>
          ⚠️ KRİTİK UYARI: Filtre Tıkanıklığı Kritik Seviyede! Lütfen Filtreyi Değiştirin veya Temizleyin.
        </div>
      )}

      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <LineChart width={800} height={400} data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="recordedAt" tickFormatter={(tick) => new Date(tick).toLocaleTimeString('tr-TR')} stroke="#64748b" />
          <YAxis stroke="#64748b" />
          <Tooltip labelFormatter={(label) => new Date(label).toLocaleString('tr-TR')} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }}/>
          <Line type="monotone" dataKey="waterLevel" name="Su Seviyesi (%)" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} isAnimationActive={true} />
          <Line type="monotone" dataKey="filterClogging" name="Filtre Tıkanıklığı (%)" stroke="#ef4444" strokeWidth={3} activeDot={{ r: 8 }} isAnimationActive={true} />
        </LineChart>
      </div>

      <div style={{ marginTop: '2rem', width: '800px', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        
        {/* TABLO BAŞLIĞI VE EXCEL İNDİRME BUTONU YAN YANA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
          <h3 style={{ color: '#0f172a', margin: 0 }}>📋 Geçmiş Arıza ve Uyarı Kayıtları</h3>
          <button 
            onClick={raporuIndir}
            style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgb(16 185 129 / 0.3)', transition: 'background-color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            📊 Raporu İndir (Excel/CSV)
          </button>
        </div>
        
        {arizaKayitlari.length === 0 ? (
          <p style={{ color: '#10b981', fontWeight: 'bold', textAlign: 'center' }}>🎉 Şu ana kadar sistemde hiçbir arıza kaydedilmedi!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #cbd5e1' }}>Tarih</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #cbd5e1' }}>Saat</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #cbd5e1' }}>Su Seviyesi</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #cbd5e1' }}>Tıkanıklık</th>
                <th style={{ padding: '0.75rem', borderBottom: '1px solid #cbd5e1' }}>Durum</th>
              </tr>
            </thead>
            <tbody>
              {arizaKayitlari.map((kayit) => {
                const rowDate = new Date(kayit.recordedAt);
                return (
                  <tr key={kayit.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{rowDate.toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: '0.75rem', color: '#64748b' }}>{rowDate.toLocaleTimeString('tr-TR')}</td>
                    <td style={{ padding: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>%{kayit.waterLevel}</td>
                    <td style={{ padding: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>%{kayit.filterClogging}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.875rem', fontWeight: 'bold' }}>Kritik Uyarı</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;