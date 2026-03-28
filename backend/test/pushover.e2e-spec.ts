import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  PushoverService,
  PushoverPriority,
  PushoverSound,
} from '../src/pushover/pushover.service';
import { PushoverModule } from '../src/pushover/pushover.module';

describe('PushoverApi (e2e)', () => {
  let service: PushoverService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PushoverModule],
    }).compile();

    service = moduleFixture.get<PushoverService>(PushoverService);
  });

  // ─── Connectivity ────────────────────────────────────────────────────────────

  describe('isConnected', () => {
    it('should return true with valid credentials', async () => {
      await expect(service.isConnected()).resolves.toBe(true);
    });

    it('should return false with invalid credentials', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [PushoverModule],
      })
        .overrideProvider(ConfigService)
        .useValue({
          getOrThrow: (key: string) => {
            if (key === 'PUSHOVER_APP_TOKEN') return 'invalid_token';
            if (key === 'PUSHOVER_USER_KEY') return 'invalid_user';
            throw new Error(`Unknown config key: ${key}`);
          },
        })
        .compile();

      const invalidService =
        moduleFixture.get<PushoverService>(PushoverService);

      await expect(invalidService.isConnected()).resolves.toBe(false);
    });
  });

  // ─── Validate ────────────────────────────────────────────────────────────────

  describe('validateUser', () => {
    it('should validate the configured user key', async () => {
      const result = await service.validateUser();

      expect(result.status).toBe(1);
      expect(Array.isArray(result.devices)).toBe(true);
    });

    it('should return an error for an invalid user key', async () => {
      await expect(service.validateUser('invalid_user_key')).rejects.toThrow();
    });
  });

  // ─── Sounds ──────────────────────────────────────────────────────────────────

  describe('getSounds', () => {
    it('should return available notification sounds', async () => {
      const result = await service.getSounds();

      expect(result.status).toBe(1);
      expect(typeof result.sounds).toBe('object');
      expect(Object.keys(result.sounds).length).toBeGreaterThan(0);
    });
  });

  // ─── Send Message ────────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('should send a basic message', async () => {
      const result = await service.sendMessage({
        message: 'e2e test — basic message',
        title: 'diakem-notification-service test',
      });

      expect(result.status).toBe(1);
      expect(result.request).toBeDefined();
    });

    it('should send a message with all optional fields', async () => {
      const result = await service.sendMessage({
        message: 'e2e test — full options',
        title: 'diakem-notification-service test',
        priority: PushoverPriority.Low,
        sound: PushoverSound.Cosmic,
        url: 'https://example.com',
        url_title: 'Example',
        timestamp: Math.floor(Date.now() / 1000),
        html: 1,
      });

      expect(result.status).toBe(1);
    });

    it('should send a high-priority message', async () => {
      const result = await service.sendMessage({
        message: 'e2e test — high priority',
        title: 'diakem-notification-service test',
        priority: PushoverPriority.High,
        sound: PushoverSound.Siren,
      });

      expect(result.status).toBe(1);
    });

    it('should send an emergency message and cancel it', async () => {
      const result = await service.sendMessage({
        message: 'e2e test — emergency (will be cancelled)',
        title: 'diakem-notification-service test',
        priority: PushoverPriority.Emergency,
        retry: 30,
        expire: 60,
      });

      expect(result.status).toBe(1);
      expect(result.receipt).toBeDefined();

      const cancel = await service.cancelEmergency(result.receipt!);
      expect(cancel.status).toBe(1);
    });

    it('should send a lowest-priority silent message', async () => {
      const result = await service.sendMessage({
        message: 'e2e test — silent',
        priority: PushoverPriority.Lowest,
        sound: PushoverSound.None,
      });

      expect(result.status).toBe(1);
    });

    it('should send a monospace-formatted message', async () => {
      const result = await service.sendMessage({
        message: 'e2e test\nline 2',
        monospace: 1,
      });

      expect(result.status).toBe(1);
    });

    it('should send a message with a ttl', async () => {
      const result = await service.sendMessage({
        message: 'e2e test — ttl 60s',
        ttl: 60,
      });

      expect(result.status).toBe(1);
    });
  });

  // ─── Receipt ─────────────────────────────────────────────────────────────────

  describe('getReceipt', () => {
    it('should retrieve a receipt for an emergency message', async () => {
      const sent = await service.sendMessage({
        message: 'e2e test — receipt check',
        priority: PushoverPriority.Emergency,
        retry: 30,
        expire: 60,
      });

      expect(sent.receipt).toBeDefined();

      const receipt = await service.getReceipt(sent.receipt!);

      expect(receipt.expired).toBeDefined();
      expect(receipt.acknowledged).toBeDefined();

      await service.cancelEmergency(sent.receipt!);
    });
  });

  // ─── Glances ─────────────────────────────────────────────────────────────────

  describe('updateGlance', () => {
    it('should push a glance update with a count', async () => {
      const result = await service.updateGlance({
        title: 'e2e test',
        text: 'glance message',
        count: 3,
      });

      expect(result.status).toBe(1);
    });

    it('should push a glance update with a percent', async () => {
      const result = await service.updateGlance({
        title: 'e2e test',
        subtext: 'progress',
        percent: 75,
      });

      expect(result.status).toBe(1);
    });
  });
});
