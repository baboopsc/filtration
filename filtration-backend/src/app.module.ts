import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { Sensor } from './sensor.entity.js';
import { SensorGateway } from './sensor.gateway.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://neondb_owner:npg_JFfStZ96mUNX@ep-still-hill-b4l02zps-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
      ssl: true, 
      entities: [Sensor],
      synchronize: true, 
    }),
    TypeOrmModule.forFeature([Sensor])
  ],
  controllers: [AppController],
  providers: [AppService, SensorGateway], // SensorGateway buraya eklendi
})
export class AppModule {}