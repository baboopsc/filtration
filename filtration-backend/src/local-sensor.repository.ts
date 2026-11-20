import * as fs from 'node:fs';
import * as path from 'node:path';
import { FindManyOptions, FindOptionsWhere } from 'typeorm';
import { Sensor, SystemStatus } from './sensor.entity.js';

interface StatusOperatorLike {
  type?: string;
  _type?: string;
  value?: unknown;
  _value?: unknown;
}

/**
 * PostgreSQL erisilemediginde verileri yerel JSON dosyasinda saklayan TypeORM Repository uyumlu depo.
 */
export class LocalSensorRepository {
  private readonly filePath: string;
  private records: Sensor[] = [];
  private nextId = 1;

  constructor(storagePath?: string) {
    this.filePath =
      storagePath || path.resolve(process.cwd(), 'data', 'sensor_data.json');
    this.loadFromDisk();
  }

  private loadFromDisk(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.records = [];
        this.nextId = 1;
        return;
      }

      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Array<
        Omit<Sensor, 'recordedAt'> & { recordedAt: string }
      >;

      if (Array.isArray(parsed)) {
        this.records = parsed.map((item) => ({
          ...item,
          recordedAt: new Date(item.recordedAt),
        }));
        const maxId = this.records.reduce((acc, r) => Math.max(acc, r.id || 0), 0);
        this.nextId = maxId + 1;
      }
    } catch {
      this.records = [];
      this.nextId = 1;
    }
  }

  private persistToDisk(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.records, null, 2), 'utf-8');
  }

  private matchesWhere(
    record: Sensor,
    where?: FindOptionsWhere<Sensor> | FindOptionsWhere<Sensor>[],
  ): boolean {
    if (!where) return true;
    if (Array.isArray(where)) {
      return where.some((w) => this.matchesWhere(record, w));
    }

    const statusCondition = where.status as unknown;
    if (statusCondition !== undefined) {
      if (typeof statusCondition === 'string') {
        if (record.status !== (statusCondition as SystemStatus)) return false;
      } else if (Array.isArray(statusCondition)) {
        if (!statusCondition.includes(record.status)) return false;
      } else if (typeof statusCondition === 'object' && statusCondition !== null) {
        const op = statusCondition as StatusOperatorLike;
        const opType = op.type ?? op._type;
        const opVal = op.value ?? op._value;
        if (opType === 'in' && Array.isArray(opVal)) {
          if (!opVal.includes(record.status)) return false;
        }
      }
    }

    if (where.deviceId !== undefined && record.deviceId !== where.deviceId) {
      return false;
    }

    return true;
  }

  create(entityLike: Partial<Sensor>): Sensor {
    const now = entityLike.recordedAt ? new Date(entityLike.recordedAt) : new Date();
    return {
      id: entityLike.id ?? 0,
      deviceId: entityLike.deviceId ?? 'SIM-UNIT-01',
      waterLevel: Number(entityLike.waterLevel ?? 0),
      filterClogging: Number(entityLike.filterClogging ?? 0),
      flowRate:
        entityLike.flowRate !== undefined && entityLike.flowRate !== null
          ? Number(entityLike.flowRate)
          : null,
      status: entityLike.status ?? 'NORMAL',
      isSystemHealthy: entityLike.isSystemHealthy ?? true,
      alertReason: entityLike.alertReason ?? 'Normal Calisma',
      estimatedMinutesToCritical:
        entityLike.estimatedMinutesToCritical !== undefined &&
        entityLike.estimatedMinutesToCritical !== null
          ? Number(entityLike.estimatedMinutesToCritical)
          : null,
      recordedAt: now,
    };
  }

  async save(entity: Sensor): Promise<Sensor> {
    const saved: Sensor = this.create({
      id: entity.id && entity.id > 0 ? entity.id : this.nextId++,
      deviceId: entity.deviceId,
      waterLevel: entity.waterLevel,
      filterClogging: entity.filterClogging,
      flowRate: entity.flowRate,
      status: entity.status,
      isSystemHealthy: entity.isSystemHealthy,
      alertReason: entity.alertReason,
      estimatedMinutesToCritical: entity.estimatedMinutesToCritical,
      recordedAt: entity.recordedAt ? new Date(entity.recordedAt) : new Date(),
    });

    const existingIdx = this.records.findIndex((r) => r.id === saved.id);
    if (existingIdx >= 0) {
      this.records[existingIdx] = saved;
    } else {
      this.records.push(saved);
    }

    this.persistToDisk();
    return saved;
  }

  async find(options?: FindManyOptions<Sensor>): Promise<Sensor[]> {
    let result = this.records.filter((r) => this.matchesWhere(r, options?.where));

    const orderDir = options?.order?.recordedAt;
    if (orderDir === 'DESC' || orderDir === 'desc') {
      result = [...result].sort(
        (a, b) =>
          new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime() ||
          b.id - a.id,
      );
    } else if (orderDir === 'ASC' || orderDir === 'asc') {
      result = [...result].sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime() ||
          a.id - b.id,
      );
    }

    if (options?.take !== undefined && options.take >= 0) {
      result = result.slice(0, options.take);
    }

    return result;
  }

  async count(options?: FindManyOptions<Sensor>): Promise<number> {
    return this.records.filter((r) => this.matchesWhere(r, options?.where)).length;
  }
}
