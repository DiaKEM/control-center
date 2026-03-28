import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NightscoutService } from '../src/nightscout/nightscout.service';
import { NightscoutModule } from '../src/nightscout/nightscout.module';

describe('NightscoutApi (e2e)', () => {
  let service: NightscoutService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), NightscoutModule],
    }).compile();

    service = moduleFixture.get<NightscoutService>(NightscoutService);
  });

  // ─── Connectivity ───────────────────────────────────────────────────────────

  describe('isConnected', () => {
    it('should connect to Nightscout and return a valid status', async () => {
      const status = await service.getStatus();

      expect(status).toBeDefined();
      expect(status.status).toBe('ok');
      expect(status.apiEnabled).toBe(true);
    });

    it('should return true when the API is reachable', async () => {
      await expect(service.isConnected()).resolves.toBe(true);
    });

    it('should return false when the API is unreachable', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forFeature(() => ({
            NIGHTSCOUT_URL: 'http://localhost:1',
            NIGHTSCOUT_API_KEY: 'invalid',
          })),
          NightscoutModule,
        ],
      })
        .overrideProvider(ConfigService)
        .useValue({
          getOrThrow: (key: string) => {
            if (key === 'NIGHTSCOUT_URL') return 'http://localhost:1';
            if (key === 'NIGHTSCOUT_API_KEY') return 'invalid';
            throw new Error(`Unknown config key: ${key}`);
          },
        })
        .compile();

      const unreachableService =
        moduleFixture.get<NightscoutService>(NightscoutService);

      await expect(unreachableService.isConnected()).resolves.toBe(false);
    });
  });

  // ─── v1 Entries ─────────────────────────────────────────────────────────────

  describe('v1 entries', () => {
    it('should fetch at least one recent entry', async () => {
      const entries = await service.getEntries({ count: 1 });

      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].sgv).toBeDefined();
    });

    it('should respect the count param', async () => {
      const entries = await service.getEntries({ count: 5 });

      expect(entries.length).toBeLessThanOrEqual(5);
    });

    it('should respect the skip param', async () => {
      const first = await service.getEntries({ count: 2 });
      const skipped = await service.getEntries({ count: 1, skip: 1 });

      expect(skipped[0]._id).toBe(first[1]._id);
    });

    it('should respect the fields param', async () => {
      const entries = await service.getEntries({
        count: 1,
        fields: 'sgv,date',
      });

      expect(entries[0].sgv).toBeDefined();
      expect(entries[0].date).toBeDefined();
    });

    it('should support find filters', async () => {
      const entries = await service.getEntries({
        count: 5,
        find: { type: 'sgv' },
      });

      entries.forEach((e) => expect(e.type).toBe('sgv'));
    });

    it('should support sort param', async () => {
      const entries = await service.getEntries({
        count: 5,
        sort: { date: -1 },
      });

      expect(entries.length).toBeGreaterThan(0);
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i - 1].date).toBeGreaterThanOrEqual(entries[i].date!);
      }
    });

    it('should fetch the current entry', async () => {
      const entries = await service.getCurrentEntry();

      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should fetch entries by spec (sgv)', async () => {
      const entries = await service.getEntriesBySpec('sgv', { count: 3 });

      expect(Array.isArray(entries)).toBe(true);
      entries.forEach((e) => expect(e.sgv).toBeDefined());
    });

    it('should create and delete an entry', async () => {
      const created = await service.createEntries([
        {
          type: 'sgv',
          sgv: 100,
          date: Date.now(),
          dateString: new Date().toISOString(),
          device: 'test-e2e',
        },
      ]);

      expect(created).toBeDefined();

      const id = created[0]?._id as string;
      expect(id).toBeDefined();

      await service.deleteEntries(id);
    });
  });

  // ─── v1 Treatments ──────────────────────────────────────────────────────────

  describe('v1 treatments', () => {
    it('should fetch treatments', async () => {
      const treatments = await service.getTreatments({ count: 5 });

      expect(Array.isArray(treatments)).toBe(true);
    });

    it('should create, update and delete a treatment', async () => {
      const [created] = await service.createTreatments([
        {
          eventType: 'Note',
          notes: 'e2e test',
          created_at: new Date().toISOString(),
          enteredBy: 'test-e2e',
        },
      ]);

      expect(created._id).toBeDefined();

      const updated = await service.updateTreatment({
        ...created,
        notes: 'e2e test updated',
      });

      expect(updated).toBeDefined();

      await service.deleteTreatment(created._id as string);
    });
  });

  // ─── v1 Device Status ────────────────────────────────────────────────────────

  describe('v1 devicestatus', () => {
    it('should fetch device statuses', async () => {
      const statuses = await service.getDeviceStatuses({ count: 3 });

      expect(Array.isArray(statuses)).toBe(true);
    });

    it('should create and delete a device status', async () => {
      const created = await service.createDeviceStatus({
        device: 'test-e2e',
        created_at: new Date().toISOString(),
      });

      expect(created._id).toBeDefined();

      await service.deleteDeviceStatus(created._id as string);
    });
  });

  // ─── v1 Profile ─────────────────────────────────────────────────────────────

  describe('v1 profile', () => {
    it('should fetch profiles', async () => {
      const profiles = await service.getProfiles();

      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });
  });

  // ─── v1 Food ─────────────────────────────────────────────────────────────────

  describe('v1 food', () => {
    it('should fetch food entries', async () => {
      const food = await service.getFood({ count: 5 });

      expect(Array.isArray(food)).toBe(true);
    });

    it('should create, update and delete a food entry', async () => {
      const [created] = await service.createFood([
        { name: 'e2e-test-food', carbs: 10, unit: 'g' },
      ]);

      expect(created._id).toBeDefined();

      const updated = await service.updateFood(created._id as string, {
        ...created,
        carbs: 20,
      });

      expect(updated).toBeDefined();

      await service.deleteFood(created._id as string);
    });
  });

  // ─── v1 Activity ─────────────────────────────────────────────────────────────

  describe('v1 activity', () => {
    it('should fetch activity entries', async () => {
      const activity = await service.getActivity({ count: 5 });

      expect(Array.isArray(activity)).toBe(true);
    });
  });

  // ─── v3 Meta ─────────────────────────────────────────────────────────────────

  describe('v3 meta', () => {
    it('should return the v3 version', async () => {
      const version = await service.getV3Version();

      expect(version).toBeDefined();
    });

    it('should return the v3 status', async () => {
      const status = await service.getV3Status();

      expect(status).toBeDefined();
    });

    it('should return the v3 settings', async () => {
      const settings = await service.getV3Settings();

      expect(settings).toBeDefined();
    });
  });

  // ─── v3 Entries ──────────────────────────────────────────────────────────────

  describe('v3 entries', () => {
    it('should fetch entries', async () => {
      const entries = await service.getV3Entries({ count: 3 });

      expect(Array.isArray(entries)).toBe(true);
    });

    it('should create, patch, update and delete an entry', async () => {
      const created = await service.createV3Entry({
        type: 'sgv',
        sgv: 110,
        date: Date.now(),
        dateString: new Date().toISOString(),
        device: 'test-e2e-v3',
      });

      expect(created._id).toBeDefined();

      const id = created._id as string;

      const fetched = await service.getV3EntryById(id);
      expect(fetched.sgv).toBe(110);

      const patched = await service.patchV3Entry(id, { sgv: 115 });
      expect(patched).toBeDefined();

      const updated = await service.updateV3Entry(id, {
        ...created,
        sgv: 120,
      });
      expect(updated).toBeDefined();

      await service.deleteV3Entry(id);
    });
  });

  // ─── v3 Treatments ───────────────────────────────────────────────────────────

  describe('v3 treatments', () => {
    it('should fetch treatments', async () => {
      const treatments = await service.getV3Treatments({ count: 3 });

      expect(Array.isArray(treatments)).toBe(true);
    });

    it('should create, patch, update and delete a treatment', async () => {
      const created = await service.createV3Treatment({
        eventType: 'Note',
        notes: 'e2e v3 test',
        created_at: new Date().toISOString(),
        enteredBy: 'test-e2e-v3',
      });

      expect(created._id).toBeDefined();

      const id = created._id as string;

      const fetched = await service.getV3TreatmentById(id);
      expect(fetched.eventType).toBe('Note');

      const patched = await service.patchV3Treatment(id, { notes: 'patched' });
      expect(patched).toBeDefined();

      const updated = await service.updateV3Treatment(id, {
        ...created,
        notes: 'updated',
      });
      expect(updated).toBeDefined();

      await service.deleteV3Treatment(id);
    });
  });

  // ─── v3 Device Status ────────────────────────────────────────────────────────

  describe('v3 devicestatus', () => {
    it('should fetch device statuses', async () => {
      const statuses = await service.getV3DeviceStatuses({ count: 3 });

      expect(Array.isArray(statuses)).toBe(true);
    });

    it('should create and delete a device status', async () => {
      const created = await service.createV3DeviceStatus({
        device: 'test-e2e-v3',
        created_at: new Date().toISOString(),
      });

      expect(created._id).toBeDefined();

      const fetched = await service.getV3DeviceStatusById(
        created._id as string,
      );
      expect(fetched).toBeDefined();

      await service.deleteV3DeviceStatus(created._id as string);
    });
  });

  // ─── v3 Profile ──────────────────────────────────────────────────────────────

  describe('v3 profile', () => {
    it('should fetch profiles', async () => {
      const profiles = await service.getV3Profiles();

      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should fetch a profile by id', async () => {
      const [first] = await service.getV3Profiles({ count: 1 });
      const fetched = await service.getV3ProfileById(first._id as string);

      expect(fetched._id).toBe(first._id);
    });
  });

  // ─── v3 Food ─────────────────────────────────────────────────────────────────

  describe('v3 food', () => {
    it('should fetch food entries', async () => {
      const food = await service.getV3Food({ count: 3 });

      expect(Array.isArray(food)).toBe(true);
    });

    it('should create, update and delete a food entry', async () => {
      const created = await service.createV3Food({
        name: 'e2e-v3-food',
        carbs: 15,
        unit: 'g',
      });

      expect(created._id).toBeDefined();

      const id = created._id as string;

      const fetched = await service.getV3FoodById(id);
      expect(fetched.name).toBe('e2e-v3-food');

      const updated = await service.updateV3Food(id, { ...created, carbs: 30 });
      expect(updated).toBeDefined();

      await service.deleteV3Food(id);
    });
  });

  // ─── v3 Activity ─────────────────────────────────────────────────────────────

  describe('v3 activity', () => {
    it('should fetch activity entries', async () => {
      const activity = await service.getV3Activity({ count: 3 });

      expect(Array.isArray(activity)).toBe(true);
    });

    it('should create, update and delete an activity entry', async () => {
      const created = await service.createV3Activity({
        eventType: 'Exercise',
        duration: 30,
        created_at: new Date().toISOString(),
      });

      expect(created._id).toBeDefined();

      const id = created._id as string;

      const fetched = await service.getV3ActivityById(id);
      expect(fetched.duration).toBe(30);

      const updated = await service.updateV3Activity(id, {
        ...created,
        duration: 60,
      });
      expect(updated).toBeDefined();

      await service.deleteV3Activity(id);
    });
  });
});
