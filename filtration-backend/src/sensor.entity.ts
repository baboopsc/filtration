import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export type SystemStatus = 'NORMAL' | 'WARNING' | 'CRITICAL';

@Entity('sensor_data')
export class Sensor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 50, default: 'SIM-UNIT-01' })
  deviceId: string;

  @Column('decimal', { precision: 5, scale: 2 })
  waterLevel: number; // Su deposunun doluluk orani (%)

  @Column('decimal', { precision: 5, scale: 2 })
  filterClogging: number; // Filtre tikaniklik yuzdesi (%)

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  flowRate: number | null; // Akis debisi (L/dk)

  @Column('varchar', { length: 20, default: 'NORMAL' })
  status: SystemStatus; // NORMAL, WARNING, CRITICAL

  @Column('boolean', { default: true })
  isSystemHealthy: boolean; // Geriye donuk uyumluluk

  @Column('varchar', { length: 255, default: 'Normal Calisma' })
  alertReason: string; // Uyari veya ariza gerekcesi

  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  estimatedMinutesToCritical: number | null; // Kestirimci bakim: Kritik esige tahmini kalan sure (dk)

  @CreateDateColumn()
  recordedAt: Date;
}