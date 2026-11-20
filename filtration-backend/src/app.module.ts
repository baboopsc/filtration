import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Sensor } from './sensor.entity.js';
import { SensorGateway } from './sensor.gateway.js';

const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://localhost:5432/filtration_db';

const isSsl = databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl,
      ssl: isSsl ? { rejectUnauthorized: false } : false,
      entities: [Sensor],
      synchronize: true, // Entity degisikliklerini otomatik semaya uygular
    }),
    TypeOrmModule.forFeature([Sensor]),
  ],
  controllers: [AppController],
  providers: [AppService, SensorGateway],
})
export class AppModule {}