import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller('api/sensor')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  async createData(@Body() body: { waterLevel: number; filterClogging: number }) {
    // Cihaz sadece 2 ham veri yolluyor, kararı service (backend) veriyor
    return this.appService.createSensorData(body.waterLevel, body.filterClogging);
  }

  @Get()
  async getAllData() {
    return this.appService.getAllSensorData();
  }
}