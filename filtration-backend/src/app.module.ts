import 'dotenv/config';
import { Inject, Logger, Module, OnModuleDestroy, Optional } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { LocalSensorRepository } from './local-sensor.repository.js';
import { Sensor } from './sensor.entity.js';
import { SensorGateway } from './sensor.gateway.js';

const logger = new Logger('DatabaseModule');
const DATA_SOURCE_TOKEN = 'FILTRATION_DATA_SOURCE';

async function createDataSourceWithTimeout(): Promise<DataSource | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn('DATABASE_URL tanimli degil; yerel JSON deposu kullaniliyor.');
    return null;
  }

  const isSsl =
    databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech');

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: isSsl ? { rejectUnauthorized: false } : false,
    entities: [Sensor],
    synchronize: true,
    connectTimeoutMS: 2500,
    extra: {
      connectionTimeoutMillis: 2500,
    },
  });

  let timer: NodeJS.Timeout | undefined;
  try {
    const initPromise = dataSource.initialize();
    initPromise.catch(() => undefined);

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error('PostgreSQL baglanti zaman asimi (2500ms)'));
      }, 2500);
    });

    await Promise.race([initPromise, timeoutPromise]);
    logger.log('PostgreSQL veritabanina basariyla baglanildi.');
    return dataSource;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    logger.warn(
      `PostgreSQL baglantisi kurulamadi (${reason}). Yerel kalici JSON deposuna (data/sensor_data.json) geciliyor.`,
    );
    await dataSource.destroy().catch(() => undefined);
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

@Module({
  controllers: [AppController],
  providers: [
    {
      provide: DATA_SOURCE_TOKEN,
      useFactory: createDataSourceWithTimeout,
    },
    {
      provide: getRepositoryToken(Sensor),
      inject: [DATA_SOURCE_TOKEN],
      useFactory: (dataSource: DataSource | null): Repository<Sensor> => {
        if (dataSource?.isInitialized) {
          return dataSource.getRepository(Sensor);
        }
        return new LocalSensorRepository() as unknown as Repository<Sensor>;
      },
    },
    AppService,
    SensorGateway,
  ],
})
export class AppModule implements OnModuleDestroy {
  constructor(
    @Optional()
    @Inject(DATA_SOURCE_TOKEN)
    private readonly dataSource?: DataSource | null,
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy().catch(() => undefined);
    }
  }
}
