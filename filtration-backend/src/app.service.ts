import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sensor } from './sensor.entity.js';
import { SensorGateway } from './sensor.gateway.js';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Sensor)
    private sensorRepository: Repository<Sensor>,
    private sensorGateway: SensorGateway,
  ) {}

  // Artık dışarıdan isSystemHealthy almıyoruz, sadece su seviyesi ve tıkanıklık geliyor
  async createSensorData(waterLevel: number, filterClogging: number) {
    
    // YAZILIM ZEKASI BÖLÜMÜ (KURAL MOTORU)
    // Eğer filtre tıkanıklığı %70 ve üzeriyse VEYA su seviyesi %20 ve altındaysa: SİSTEM SAĞLIKSIZDIR!
    const isSystemHealthy = (filterClogging >= 70 || waterLevel <= 20) ? false : true;

    const newData = this.sensorRepository.create({
      waterLevel,
      filterClogging,
      isSystemHealthy, // Kendi hesapladığımız sonucu veritabanına yazıyoruz
    });
    
    const savedData = await this.sensorRepository.save(newData);
    
    // O milisaniye React'a canlı yayınlıyoruz
    this.sensorGateway.broadcastNewData(savedData);
    
    return savedData;
  }

  async getAllSensorData() {
    return await this.sensorRepository.find({
      order: { recordedAt: 'DESC' },
      take: 20,
    });
  }
}