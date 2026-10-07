import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('sensor_data')
export class Sensor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal')
  waterLevel: number; // Su deposunun doluluk oranı/seviyesi

  @Column('decimal')
  filterClogging: number; // Tekstil ekibinin test edeceği filtrenin tıkanıklık yüzdesi

  @Column('boolean', { default: true })
  isSystemHealthy: boolean; // Sistem genel sağlık durumu

  @CreateDateColumn()
  recordedAt: Date;
}