import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Sensor, SystemStatus } from './sensor.entity.js';
import { SensorGateway } from './sensor.gateway.js';
import { CreateSensorDataDto } from './dto/create-sensor-data.dto.js';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
    private sensorGateway: SensorGateway,
  ) {}

  /**
   * Kural ve trend tabanli analiz gerceklestirerek sensor verisini kaydeder ve Socket.IO uzerinden dagitir.
   */
  async createSensorData(dto: CreateSensorDataDto): Promise<Sensor> {
    const { waterLevel, filterClogging } = dto;
    const deviceId = dto.deviceId || 'SIM-UNIT-01';

    // Fiziksel debi hesabi: Eger cihazdan gelmediyse, filtre tikanikligina bagli nominal debi (L/dk)
    const flowRate =
      dto.flowRate !== undefined
        ? dto.flowRate
        : Math.max(0.2, Number((5.0 * (1 - filterClogging / 100)).toFixed(2)));

    // 1. KURAL TABANLI DURUM VE UYARI ANALIZI (3 Seviyeli: NORMAL / WARNING / CRITICAL)
    let status: SystemStatus = 'NORMAL';
    const reasons: string[] = [];

    // Filtre Tikanikligi Esikleri
    if (filterClogging >= 70) {
      status = 'CRITICAL';
      reasons.push(`Filtre tikanikligi kritik seviyede (%${filterClogging.toFixed(1)})`);
    } else if (filterClogging >= 50) {
      status = 'WARNING';
      reasons.push(`Filtre tikanikligi yuksek (%${filterClogging.toFixed(1)})`);
    }

    // Su Seviyesi Esikleri
    if (waterLevel <= 20) {
      status = 'CRITICAL';
      reasons.push(`Su seviyesi kritik esigin altinda (%${waterLevel.toFixed(1)})`);
    } else if (waterLevel <= 30) {
      if (status !== 'CRITICAL') {
        status = 'WARNING';
      }
      reasons.push(`Su seviyesi azaliyor (%${waterLevel.toFixed(1)})`);
    }

    const alertReason = reasons.length > 0 ? reasons.join(' | ') : 'Sistem normal parametrelerde calisiyor';
    const isSystemHealthy = status !== 'CRITICAL';

    // 2. KESTIRIMCI BAKIM / TREND ANALIZI
    // Veritabanindaki son kayitlar arasindaki tikaniklik ivmesi
    const recentRecords = await this.sensorRepository.find({
      order: { recordedAt: 'DESC' },
      take: 5,
    });

    let estimatedMinutesToCritical: number | null = null;

    if (filterClogging < 70 && recentRecords.length >= 1) {
      const reference = recentRecords[recentRecords.length - 1];
      const timeDiffSeconds = Math.abs(
        (new Date(recentRecords[0].recordedAt).getTime() - new Date(reference.recordedAt).getTime()) / 1000,
      );
      const cloggingDiff = Number(filterClogging) - Number(reference.filterClogging);

      // Eger son olcumlerde tikaniklik artis yonundeyse
      if (cloggingDiff > 0.3) {
        const effectiveSeconds = Math.max(2, timeDiffSeconds || 2);
        const ratePerSecond = cloggingDiff / effectiveSeconds;
        const remainingTo70 = 70 - filterClogging;
        const secondsRemaining = remainingTo70 / ratePerSecond;
        const minutesRemaining = secondsRemaining / 60;

        if (minutesRemaining > 0 && minutesRemaining <= 60) {
          estimatedMinutesToCritical = Number(minutesRemaining.toFixed(1));
        }
      }
    }

    // 3. VERITABANINA KAYIT
    const sensorRecord = this.sensorRepository.create({
      deviceId,
      waterLevel,
      filterClogging,
      flowRate,
      status,
      isSystemHealthy,
      alertReason,
      estimatedMinutesToCritical,
    });

    const savedRecord = await this.sensorRepository.save(sensorRecord);

    // 4. CANLI YAYIN (Socket.IO)
    this.sensorGateway.broadcastNewData(savedRecord);

    return savedRecord;
  }

  /**
   * Son N olcumu listeler (Dashboard grafigi icin)
   */
  async getAllSensorData(limit = 20): Promise<Sensor[]> {
    return await this.sensorRepository.find({
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Yalnizca kritik veya uyari durumundaki kayitlari listeler (Raporlama ve tablo icin)
   */
  async getFailureRecords(limit = 100): Promise<Sensor[]> {
    return await this.sensorRepository.find({
      where: {
        status: In(['WARNING', 'CRITICAL']),
      },
      order: { recordedAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Sistem genel ozeti
   */
  async getSystemSummary() {
    const latestList = await this.sensorRepository.find({
      order: { recordedAt: 'DESC' },
      take: 1,
    });
    const latest = latestList.length > 0 ? latestList[0] : null;

    const criticalCount = await this.sensorRepository.count({
      where: { status: 'CRITICAL' },
    });

    const warningCount = await this.sensorRepository.count({
      where: { status: 'WARNING' },
    });

    const totalCount = await this.sensorRepository.count();

    return {
      latest,
      counts: {
        total: totalCount,
        critical: criticalCount,
        warning: warningCount,
      },
      serverTime: new Date().toISOString(),
    };
  }
}