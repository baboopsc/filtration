import { Controller, Get, Post, Body, Query, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { AppService } from './app.service.js';
import { CreateSensorDataDto } from './dto/create-sensor-data.dto.js';

@Controller('api/sensor')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'smart-filtration-backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  async createData(@Body() createDto: CreateSensorDataDto) {
    return this.appService.createSensorData(createDto);
  }

  @Get()
  async getAllData(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.appService.getAllSensorData(limit);
  }

  @Get('failures')
  async getFailures(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return this.appService.getFailureRecords(limit);
  }

  @Get('summary')
  async getSummary() {
    return this.appService.getSystemSummary();
  }
}