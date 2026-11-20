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
      clearAllSensorData: vi.fn().mockResolvedValue({
        status: 'cleared',
        clearedAt: '2026-11-21T00:00:00.000Z',
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

  describe('clearData', () => {
    it('should call service clearAllSensorData', async () => {
      const res = await appController.clearData();
      expect(res.status).toBe('cleared');
      expect(mockAppService.clearAllSensorData).toHaveBeenCalledTimes(1);
    });
  });
});

describe('AppService (Rule Engine & Trend Prediction)', () => {
  let appService: AppService;
  let mockRepo: any;
  let mockGateway: any;

  beforeEach(() => {
    mockRepo = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockImplementation((entity) => ({ id: 1, recordedAt: new Date(), ...entity })),
      save: vi.fn().mockImplementation((entity) => Promise.resolve(entity)),
      count: vi.fn().mockResolvedValue(0),
      clear: vi.fn().mockResolvedValue(undefined),
    };
    mockGateway = {
      broadcastNewData: vi.fn(),
      broadcastDataCleared: vi.fn(),
    };
    appService = new AppService(mockRepo, mockGateway);
  });

  it('should classify NORMAL when waterLevel > 30 and filterClogging < 50', async () => {
    const res = await appService.createSensorData({
      deviceId: 'ESP32-YFS201-01',
      waterLevel: 80,
      filterClogging: 25,
      flowRate: 3.75,
    });
    expect(res.status).toBe('NORMAL');
    expect(res.isSystemHealthy).toBe(true);
    expect(mockGateway.broadcastNewData).toHaveBeenCalledTimes(1);
  });

  it('should classify WARNING when filterClogging is between 50 and 69.9', async () => {
    const res = await appService.createSensorData({
      waterLevel: 60,
      filterClogging: 55,
    });
    expect(res.status).toBe('WARNING');
    expect(res.isSystemHealthy).toBe(true);
    expect(res.flowRate).toBe(2.25);
  });

  it('should classify CRITICAL when filterClogging >= 70 or waterLevel <= 20', async () => {
    const resClog = await appService.createSensorData({
      waterLevel: 60,
      filterClogging: 72,
    });
    expect(resClog.status).toBe('CRITICAL');
    expect(resClog.isSystemHealthy).toBe(false);

    const resWater = await appService.createSensorData({
      waterLevel: 18,
      filterClogging: 20,
    });
    expect(resWater.status).toBe('CRITICAL');
    expect(resWater.isSystemHealthy).toBe(false);
  });

  it('should compute estimatedMinutesToCritical using elapsed time to Date.now()', async () => {
    const tenSecondsAgo = new Date(Date.now() - 10_000);
    mockRepo.find.mockResolvedValue([
      { filterClogging: 45, recordedAt: new Date(Date.now() - 2_000) },
      { filterClogging: 42, recordedAt: tenSecondsAgo },
    ]);

    const res = await appService.createSensorData({
      waterLevel: 70,
      filterClogging: 46,
    });

    // cloggingDiff = 46 - 42 = 4%, elapsed = ~10s -> rate = 0.4 %/s -> remaining 24% = 60s = 1.0 min
    expect(res.estimatedMinutesToCritical).not.toBeNull();
    expect(res.estimatedMinutesToCritical).toBeGreaterThanOrEqual(0.8);
    expect(res.estimatedMinutesToCritical).toBeLessThanOrEqual(1.2);
  });

  it('should clear repository and broadcast verilerTemizlendi on clearAllSensorData', async () => {
    const res = await appService.clearAllSensorData();
    expect(res.status).toBe('cleared');
    expect(mockRepo.clear).toHaveBeenCalledTimes(1);
    expect(mockGateway.broadcastDataCleared).toHaveBeenCalledTimes(1);
  });
});
