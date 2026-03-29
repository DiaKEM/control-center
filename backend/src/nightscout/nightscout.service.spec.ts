import { NightscoutService } from './nightscout.service';
import { ConfigService } from '@nestjs/config';

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  }),
}));

import axios from 'axios';

const makeConfigService = () =>
  ({
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'NIGHTSCOUT_URL') return 'http://nightscout.test/';
      if (key === 'NIGHTSCOUT_API_KEY') return 'testapikey';
      return '';
    }),
  }) as unknown as ConfigService;

describe('NightscoutService', () => {
  let service: NightscoutService;
  let client: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      put: jest.fn().mockResolvedValue({ data: {} }),
      patch: jest.fn().mockResolvedValue({ data: {} }),
      delete: jest.fn().mockResolvedValue({ data: {} }),
    });
    service = new NightscoutService(makeConfigService());
    client = (axios.create as jest.Mock).mock.results.at(-1)!.value;
  });

  describe('constructor', () => {
    it('strips trailing slash from base URL', () => {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({ baseURL: 'http://nightscout.test' }),
      );
    });
  });

  // ── v1 API ────────────────────────────────────────────────────────────────

  describe('getStatus()', () => {
    it('calls GET /api/v1/status', async () => {
      client.get.mockResolvedValue({ data: { status: 'ok' } });
      const result = await service.getStatus();
      expect(client.get).toHaveBeenCalledWith('/api/v1/status');
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('isConnected()', () => {
    it('returns true when status is ok', async () => {
      client.get.mockResolvedValue({ data: { status: 'ok' } });
      expect(await service.isConnected()).toBe(true);
    });

    it('returns false when status is not ok', async () => {
      client.get.mockResolvedValue({ data: { status: 'error' } });
      expect(await service.isConnected()).toBe(false);
    });

    it('returns false on error', async () => {
      client.get.mockRejectedValue(new Error('network'));
      expect(await service.isConnected()).toBe(false);
    });
  });

  describe('getEntries()', () => {
    it('calls GET /api/v1/entries with params', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getEntries({
        count: 10,
        skip: 5,
        fields: 'sgv',
        sort: { date: -1 },
        custom: 'val',
      });
      expect(client.get).toHaveBeenCalledWith('/api/v1/entries', {
        params: expect.objectContaining({
          count: 10,
          skip: 5,
          fields: 'sgv',
          'sort[date]': -1,
          custom: 'val',
        }),
      });
    });
  });

  describe('getEntriesBySpec()', () => {
    it('calls GET /api/v1/entries/:spec', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getEntriesBySpec('current');
      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/entries/current',
        expect.any(Object),
      );
    });
  });

  describe('getCurrentEntry()', () => {
    it('calls GET /api/v1/entries/current', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getCurrentEntry();
      expect(client.get).toHaveBeenCalledWith('/api/v1/entries/current');
    });
  });

  describe('createEntries()', () => {
    it('calls POST /api/v1/entries', async () => {
      client.post.mockResolvedValue({ data: [] });
      await service.createEntries([{ sgv: 100 }]);
      expect(client.post).toHaveBeenCalledWith('/api/v1/entries', [
        { sgv: 100 },
      ]);
    });
  });

  describe('deleteEntries()', () => {
    it('calls DELETE /api/v1/entries/:spec', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteEntries('abc');
      expect(client.delete).toHaveBeenCalledWith(
        '/api/v1/entries/abc',
        expect.any(Object),
      );
    });
  });

  describe('getTreatments()', () => {
    it('calls GET /api/v1/treatments', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getTreatments({ find: { eventType: 'Site Change' } });
      expect(client.get).toHaveBeenCalledWith('/api/v1/treatments', {
        params: expect.objectContaining({ 'find[eventType]': 'Site Change' }),
      });
    });
  });

  describe('createTreatments()', () => {
    it('calls POST /api/v1/treatments', async () => {
      client.post.mockResolvedValue({ data: [] });
      await service.createTreatments([{ eventType: 'Bolus' }]);
      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/treatments',
        expect.any(Array),
      );
    });
  });

  describe('updateTreatment()', () => {
    it('calls PUT /api/v1/treatments', async () => {
      client.put.mockResolvedValue({ data: {} });
      await service.updateTreatment({ eventType: 'Bolus' });
      expect(client.put).toHaveBeenCalledWith(
        '/api/v1/treatments',
        expect.any(Object),
      );
    });
  });

  describe('deleteTreatment()', () => {
    it('calls DELETE /api/v1/treatments/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteTreatment('t-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v1/treatments/t-id');
    });
  });

  describe('getProfiles()', () => {
    it('calls GET /api/v1/profile', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getProfiles();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/profile',
        expect.any(Object),
      );
    });
  });

  describe('createProfile()', () => {
    it('calls POST /api/v1/profile', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createProfile({ defaultProfile: 'Default' });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/profile',
        expect.any(Object),
      );
    });
  });

  describe('getDeviceStatuses()', () => {
    it('calls GET /api/v1/devicestatus', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getDeviceStatuses();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/devicestatus',
        expect.any(Object),
      );
    });
  });

  describe('createDeviceStatus()', () => {
    it('calls POST /api/v1/devicestatus', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createDeviceStatus({ device: 'test' });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/devicestatus',
        expect.any(Object),
      );
    });
  });

  describe('deleteDeviceStatus()', () => {
    it('calls DELETE /api/v1/devicestatus/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteDeviceStatus('ds-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v1/devicestatus/ds-id');
    });
  });

  describe('getFood()', () => {
    it('calls GET /api/v1/food', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getFood();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/food',
        expect.any(Object),
      );
    });
  });

  describe('createFood()', () => {
    it('calls POST /api/v1/food', async () => {
      client.post.mockResolvedValue({ data: [] });
      await service.createFood([{ name: 'Apple' }]);
      expect(client.post).toHaveBeenCalledWith(
        '/api/v1/food',
        expect.any(Array),
      );
    });
  });

  describe('updateFood()', () => {
    it('calls PUT /api/v1/food/:id', async () => {
      client.put.mockResolvedValue({ data: {} });
      await service.updateFood('f-id', { name: 'Banana' });
      expect(client.put).toHaveBeenCalledWith(
        '/api/v1/food/f-id',
        expect.any(Object),
      );
    });
  });

  describe('deleteFood()', () => {
    it('calls DELETE /api/v1/food/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteFood('f-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v1/food/f-id');
    });
  });

  describe('getActivity()', () => {
    it('calls GET /api/v1/activity', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getActivity();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v1/activity',
        expect.any(Object),
      );
    });
  });

  // ── v3 API ────────────────────────────────────────────────────────────────

  describe('getV3Version()', () => {
    it('calls GET /api/v3/version', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3Version();
      expect(client.get).toHaveBeenCalledWith('/api/v3/version');
    });
  });

  describe('getV3Status()', () => {
    it('calls GET /api/v3/status', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3Status();
      expect(client.get).toHaveBeenCalledWith('/api/v3/status');
    });
  });

  describe('getV3Entries()', () => {
    it('calls GET /api/v3/entries', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getV3Entries();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v3/entries',
        expect.any(Object),
      );
    });
  });

  describe('getV3EntryById()', () => {
    it('calls GET /api/v3/entries/:id', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3EntryById('e-id');
      expect(client.get).toHaveBeenCalledWith('/api/v3/entries/e-id');
    });
  });

  describe('createV3Entry()', () => {
    it('calls POST /api/v3/entries', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createV3Entry({ sgv: 100 });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v3/entries',
        expect.any(Object),
      );
    });
  });

  describe('updateV3Entry()', () => {
    it('calls PUT /api/v3/entries/:id', async () => {
      client.put.mockResolvedValue({ data: {} });
      await service.updateV3Entry('e-id', { sgv: 110 });
      expect(client.put).toHaveBeenCalledWith(
        '/api/v3/entries/e-id',
        expect.any(Object),
      );
    });
  });

  describe('patchV3Entry()', () => {
    it('calls PATCH /api/v3/entries/:id', async () => {
      client.patch.mockResolvedValue({ data: {} });
      await service.patchV3Entry('e-id', { sgv: 90 });
      expect(client.patch).toHaveBeenCalledWith(
        '/api/v3/entries/e-id',
        expect.any(Object),
      );
    });
  });

  describe('deleteV3Entry()', () => {
    it('calls DELETE /api/v3/entries/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteV3Entry('e-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v3/entries/e-id');
    });
  });

  describe('getV3Treatments()', () => {
    it('calls GET /api/v3/treatments', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getV3Treatments();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v3/treatments',
        expect.any(Object),
      );
    });
  });

  describe('getV3TreatmentById()', () => {
    it('calls GET /api/v3/treatments/:id', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3TreatmentById('t-id');
      expect(client.get).toHaveBeenCalledWith('/api/v3/treatments/t-id');
    });
  });

  describe('createV3Treatment()', () => {
    it('calls POST /api/v3/treatments', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createV3Treatment({ eventType: 'Bolus' });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v3/treatments',
        expect.any(Object),
      );
    });
  });

  describe('updateV3Treatment()', () => {
    it('calls PUT /api/v3/treatments/:id', async () => {
      client.put.mockResolvedValue({ data: {} });
      await service.updateV3Treatment('t-id', { eventType: 'Bolus' });
      expect(client.put).toHaveBeenCalledWith(
        '/api/v3/treatments/t-id',
        expect.any(Object),
      );
    });
  });

  describe('patchV3Treatment()', () => {
    it('calls PATCH /api/v3/treatments/:id', async () => {
      client.patch.mockResolvedValue({ data: {} });
      await service.patchV3Treatment('t-id', { eventType: 'Bolus' });
      expect(client.patch).toHaveBeenCalledWith(
        '/api/v3/treatments/t-id',
        expect.any(Object),
      );
    });
  });

  describe('deleteV3Treatment()', () => {
    it('calls DELETE /api/v3/treatments/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteV3Treatment('t-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v3/treatments/t-id');
    });
  });

  describe('getV3DeviceStatuses()', () => {
    it('calls GET /api/v3/devicestatus', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getV3DeviceStatuses();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v3/devicestatus',
        expect.any(Object),
      );
    });
  });

  describe('getV3DeviceStatusById()', () => {
    it('calls GET /api/v3/devicestatus/:id', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3DeviceStatusById('ds-id');
      expect(client.get).toHaveBeenCalledWith('/api/v3/devicestatus/ds-id');
    });
  });

  describe('createV3DeviceStatus()', () => {
    it('calls POST /api/v3/devicestatus', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createV3DeviceStatus({ device: 'test' });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v3/devicestatus',
        expect.any(Object),
      );
    });
  });

  describe('deleteV3DeviceStatus()', () => {
    it('calls DELETE /api/v3/devicestatus/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteV3DeviceStatus('ds-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v3/devicestatus/ds-id');
    });
  });

  describe('getV3Profiles()', () => {
    it('calls GET /api/v3/profile', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getV3Profiles();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v3/profile',
        expect.any(Object),
      );
    });
  });

  describe('getV3ProfileById()', () => {
    it('calls GET /api/v3/profile/:id', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3ProfileById('p-id');
      expect(client.get).toHaveBeenCalledWith('/api/v3/profile/p-id');
    });
  });

  describe('createV3Profile()', () => {
    it('calls POST /api/v3/profile', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createV3Profile({ defaultProfile: 'Default' });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v3/profile',
        expect.any(Object),
      );
    });
  });

  describe('updateV3Profile()', () => {
    it('calls PUT /api/v3/profile/:id', async () => {
      client.put.mockResolvedValue({ data: {} });
      await service.updateV3Profile('p-id', { defaultProfile: 'Default' });
      expect(client.put).toHaveBeenCalledWith(
        '/api/v3/profile/p-id',
        expect.any(Object),
      );
    });
  });

  describe('deleteV3Profile()', () => {
    it('calls DELETE /api/v3/profile/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteV3Profile('p-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v3/profile/p-id');
    });
  });

  describe('getV3Food()', () => {
    it('calls GET /api/v3/food', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getV3Food();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v3/food',
        expect.any(Object),
      );
    });
  });

  describe('getV3FoodById()', () => {
    it('calls GET /api/v3/food/:id', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3FoodById('f-id');
      expect(client.get).toHaveBeenCalledWith('/api/v3/food/f-id');
    });
  });

  describe('createV3Food()', () => {
    it('calls POST /api/v3/food', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createV3Food({ name: 'Apple' });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v3/food',
        expect.any(Object),
      );
    });
  });

  describe('updateV3Food()', () => {
    it('calls PUT /api/v3/food/:id', async () => {
      client.put.mockResolvedValue({ data: {} });
      await service.updateV3Food('f-id', { name: 'Banana' });
      expect(client.put).toHaveBeenCalledWith(
        '/api/v3/food/f-id',
        expect.any(Object),
      );
    });
  });

  describe('deleteV3Food()', () => {
    it('calls DELETE /api/v3/food/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteV3Food('f-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v3/food/f-id');
    });
  });

  describe('getV3Activity()', () => {
    it('calls GET /api/v3/activity', async () => {
      client.get.mockResolvedValue({ data: [] });
      await service.getV3Activity();
      expect(client.get).toHaveBeenCalledWith(
        '/api/v3/activity',
        expect.any(Object),
      );
    });
  });

  describe('getV3ActivityById()', () => {
    it('calls GET /api/v3/activity/:id', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3ActivityById('a-id');
      expect(client.get).toHaveBeenCalledWith('/api/v3/activity/a-id');
    });
  });

  describe('createV3Activity()', () => {
    it('calls POST /api/v3/activity', async () => {
      client.post.mockResolvedValue({ data: {} });
      await service.createV3Activity({ eventType: 'Exercise' });
      expect(client.post).toHaveBeenCalledWith(
        '/api/v3/activity',
        expect.any(Object),
      );
    });
  });

  describe('updateV3Activity()', () => {
    it('calls PUT /api/v3/activity/:id', async () => {
      client.put.mockResolvedValue({ data: {} });
      await service.updateV3Activity('a-id', { eventType: 'Exercise' });
      expect(client.put).toHaveBeenCalledWith(
        '/api/v3/activity/a-id',
        expect.any(Object),
      );
    });
  });

  describe('deleteV3Activity()', () => {
    it('calls DELETE /api/v3/activity/:id', async () => {
      client.delete.mockResolvedValue({ data: {} });
      await service.deleteV3Activity('a-id');
      expect(client.delete).toHaveBeenCalledWith('/api/v3/activity/a-id');
    });
  });

  describe('getV3Settings()', () => {
    it('calls GET /api/v3/settings', async () => {
      client.get.mockResolvedValue({ data: {} });
      await service.getV3Settings();
      expect(client.get).toHaveBeenCalledWith('/api/v3/settings');
    });
  });

  // ── Helper methods ────────────────────────────────────────────────────────

  describe('getLatestPumpOcclusion()', () => {
    it('returns true when pump.status.suspended is true', async () => {
      client.get.mockResolvedValue({
        data: [{ pump: { status: { suspended: true } } }],
      });
      expect(await service.getLatestPumpOcclusion()).toBe(true);
    });

    it('returns false when pump.status.suspended is false', async () => {
      client.get.mockResolvedValue({
        data: [{ pump: { status: { suspended: false } } }],
      });
      expect(await service.getLatestPumpOcclusion()).toBe(false);
    });

    it('returns false when no device status entries', async () => {
      client.get.mockResolvedValue({ data: [] });
      expect(await service.getLatestPumpOcclusion()).toBe(false);
    });

    it('returns false when pump field is missing', async () => {
      client.get.mockResolvedValue({ data: [{}] });
      expect(await service.getLatestPumpOcclusion()).toBe(false);
    });

    it('returns false when pump.status is missing', async () => {
      client.get.mockResolvedValue({ data: [{ pump: {} }] });
      expect(await service.getLatestPumpOcclusion()).toBe(false);
    });
  });

  describe('getLatestBatteryLevel()', () => {
    it('returns battery from uploader.battery', async () => {
      client.get.mockResolvedValue({ data: [{ uploader: { battery: 85 } }] });
      expect(await service.getLatestBatteryLevel()).toBe(85);
    });

    it('returns battery from uploaderBattery fallback', async () => {
      client.get.mockResolvedValue({ data: [{ uploaderBattery: 60 }] });
      expect(await service.getLatestBatteryLevel()).toBe(60);
    });

    it('returns null when no device status entries', async () => {
      client.get.mockResolvedValue({ data: [] });
      expect(await service.getLatestBatteryLevel()).toBeNull();
    });

    it('returns null when uploader has no battery field', async () => {
      client.get.mockResolvedValue({ data: [{ uploader: {} }] });
      expect(await service.getLatestBatteryLevel()).toBeNull();
    });
  });

  describe('getLatestInsulinLevel()', () => {
    it('returns reservoir from pump.reservoir', async () => {
      client.get.mockResolvedValue({ data: [{ pump: { reservoir: 120.5 } }] });
      expect(await service.getLatestInsulinLevel()).toBe(120.5);
    });

    it('returns null when no device status entries', async () => {
      client.get.mockResolvedValue({ data: [] });
      expect(await service.getLatestInsulinLevel()).toBeNull();
    });

    it('returns null when pump field is missing', async () => {
      client.get.mockResolvedValue({ data: [{}] });
      expect(await service.getLatestInsulinLevel()).toBeNull();
    });

    it('returns null when pump.reservoir is not a number', async () => {
      client.get.mockResolvedValue({ data: [{ pump: { reservoir: null } }] });
      expect(await service.getLatestInsulinLevel()).toBeNull();
    });
  });

  describe('getLastPumpChange()', () => {
    it('returns treatment and elapsed days', async () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      client.get.mockResolvedValue({
        data: [{ eventType: 'Site Change', created_at: twoHoursAgo }],
      });
      const result = await service.getLastPumpChange();
      expect(result).not.toBeNull();
      expect(result!.elapsedDays).toBeCloseTo(2 / 24, 3);
    });

    it('returns null when no treatments found', async () => {
      client.get.mockResolvedValue({ data: [] });
      expect(await service.getLastPumpChange()).toBeNull();
    });

    it('returns null when treatment has no created_at', async () => {
      client.get.mockResolvedValue({ data: [{ eventType: 'Site Change' }] });
      expect(await service.getLastPumpChange()).toBeNull();
    });

    it('returns null when created_at is not a valid date', async () => {
      client.get.mockResolvedValue({
        data: [{ eventType: 'Site Change', created_at: 'invalid' }],
      });
      expect(await service.getLastPumpChange()).toBeNull();
    });
  });

  describe('getLastSensorChange()', () => {
    it('returns treatment and elapsed days', async () => {
      const oneDayAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000,
      ).toISOString();
      client.get.mockResolvedValue({
        data: [{ eventType: 'Sensor Change', created_at: oneDayAgo }],
      });
      const result = await service.getLastSensorChange();
      expect(result).not.toBeNull();
      expect(result!.elapsedDays).toBeCloseTo(1, 2);
    });

    it('returns null when no treatments found', async () => {
      client.get.mockResolvedValue({ data: [] });
      expect(await service.getLastSensorChange()).toBeNull();
    });

    it('returns null when treatment has no created_at', async () => {
      client.get.mockResolvedValue({ data: [{ eventType: 'Sensor Change' }] });
      expect(await service.getLastSensorChange()).toBeNull();
    });

    it('returns null when created_at is invalid', async () => {
      client.get.mockResolvedValue({
        data: [{ eventType: 'Sensor Change', created_at: 'bad' }],
      });
      expect(await service.getLastSensorChange()).toBeNull();
    });
  });
});
