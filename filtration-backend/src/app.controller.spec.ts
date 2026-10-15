import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;
  let mockAppService: Partial<AppService>;

  beforeEach(() => {
    mockAppService = {
      createSensorData: vi.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: 1,
          deviceId: dto.deviceId || 'SIM-UNIT-01',
          waterLevel: dto.waterLevel,
          filterClogging: dto.filterClogging,
          flowRate: 3.5,
          status: 'NORMAL',
          isSystemHealthy: true,
          alertReason: 'Sistem normal parametrelerde calisiyor',
          estimatedMinutesToCritical: null,
          recordedAt: new Date(),
        }),
      ),
      getAllSensorData: vi.fn().mockResolvedValue([
        {
          id: 1,
          waterLevel: 80,
          filterClogging: 20,
          status: 'NORMAL',
        },
      ]),
      getFailureRecords: vi.fn().mockResolvedValue([]),
      getSystemSummary: vi.fn().mockResolvedValue({
        counts: { total: 1, critical: 0, warning: 0 },
      }),
    };

    appController = new AppController(mockAppService as AppService);
  });

  describe('health check', () => {
    it('should return health status', () => {
      const result = appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('smart-filtration-backend');
    });
  });

  describe('createData', () => {
    it('should call service createSensorData and return saved record', async () => {
      const dto = { waterLevel: 75, filterClogging: 25 };
      const res = await appController.createData(dto);
      expect(res.waterLevel).toBe(75);
      expect(res.filterClogging).toBe(25);
      expect(mockAppService.createSensorData).toHaveBeenCalledWith(dto);
    });
  });

  describe('getAllData', () => {
    it('should return sensor data list', async () => {
      const res = await appController.getAllData(20);
      expect(Array.isArray(res)).toBe(true);
      expect(res.length).toBe(1);
    });
  });
});
