import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegramService } from '../src/telegram/telegram.service';
import { TelegramModule } from '../src/telegram/telegram.module';

describe('TelegramApi (e2e)', () => {
  let service: TelegramService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TelegramModule],
    }).compile();

    service = moduleFixture.get<TelegramService>(TelegramService);
  });

  // ─── Connectivity ────────────────────────────────────────────────────────────

  describe('isConnected', () => {
    it('should return true and send a test message with valid credentials', async () => {
      await expect(service.isConnected()).resolves.toBe(true);
    });

    it('should return false with an invalid bot token', async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [TelegramModule],
      })
        .overrideProvider(ConfigService)
        .useValue({
          getOrThrow: (key: string) => {
            if (key === 'TELEGRAM_BOT_TOKEN') return '0000000000:invalid_token';
            if (key === 'TELEGRAM_CHAT_ID') return '0';
            throw new Error(`Unknown config key: ${key}`);
          },
        })
        .compile();

      const invalidService =
        moduleFixture.get<TelegramService>(TelegramService);

      await expect(invalidService.isConnected()).resolves.toBe(false);
    });
  });

  // ─── Bot Info ────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('should return bot info', async () => {
      const me = await service.getMe();

      expect(me.is_bot).toBe(true);
      expect(me.id).toBeDefined();
      expect(me.first_name).toBeDefined();
    });
  });

  // ─── Chat Info ────────────────────────────────────────────────────────────────

  describe('getChat', () => {
    it('should return chat info for the configured chat', async () => {
      const chat = await service.getChat();

      expect(chat.id).toBeDefined();
      expect(chat.type).toBeDefined();
    });
  });

  describe('getChatMemberCount', () => {
    it('should return the number of members in the chat', async () => {
      const count = await service.getChatMemberCount();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Send Message ────────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('should send a plain text message', async () => {
      const msg = await service.sendMessage('e2e test — plain text');

      expect(msg.message_id).toBeDefined();
      expect(msg.text).toBe('e2e test — plain text');
    });

    it('should send an HTML-formatted message', async () => {
      const msg = await service.sendMessage(
        'e2e test — <b>bold</b> and <i>italic</i>',
        { parse_mode: 'HTML' },
      );

      expect(msg.message_id).toBeDefined();
    });

    it('should send a MarkdownV2-formatted message', async () => {
      const msg = await service.sendMessage('e2e test — *bold*', {
        parse_mode: 'MarkdownV2',
      });

      expect(msg.message_id).toBeDefined();
    });

    it('should send a silent message', async () => {
      const msg = await service.sendMessage('e2e test — silent', {
        disable_notification: true,
      });

      expect(msg.message_id).toBeDefined();
    });

    it('should send a message with a link preview disabled', async () => {
      const msg = await service.sendMessage(
        'e2e test — https://example.com (no preview)',
        { link_preview_disabled: true },
      );

      expect(msg.message_id).toBeDefined();
    });

    it('should send a message with an inline keyboard', async () => {
      const msg = await service.sendMessage('e2e test — inline keyboard', {
        reply_markup: {
          inline_keyboard: [[{ text: 'Visit', url: 'https://example.com' }]],
        },
      });

      expect(msg.message_id).toBeDefined();
    });
  });

  // ─── Edit & Delete ───────────────────────────────────────────────────────────

  describe('editMessageText', () => {
    it('should edit a previously sent message', async () => {
      const sent = await service.sendMessage('e2e test — original');
      const edited = await service.editMessageText(
        sent.message_id,
        'e2e test — edited',
      );

      expect(edited.message_id).toBe(sent.message_id);
      expect(edited.text).toBe('e2e test — edited');
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      const sent = await service.sendMessage('e2e test — will be deleted', {
        disable_notification: true,
      });

      await expect(service.deleteMessage(sent.message_id)).resolves.toBe(true);
    });
  });

  // ─── Pin & Unpin ─────────────────────────────────────────────────────────────

  describe('pinMessage / unpinMessage', () => {
    it('should pin and unpin a message', async () => {
      const sent = await service.sendMessage('e2e test — will be pinned', {
        disable_notification: true,
      });

      await expect(
        service.pinMessage(sent.message_id, undefined, true),
      ).resolves.toBe(true);

      await expect(service.unpinMessage(sent.message_id)).resolves.toBe(true);

      await service.deleteMessage(sent.message_id);
    });
  });

  // ─── Chat Action ─────────────────────────────────────────────────────────────

  describe('sendChatAction', () => {
    it('should send a typing action', async () => {
      await expect(service.sendChatAction('typing')).resolves.toBe(true);
    });

    it('should send an upload_photo action', async () => {
      await expect(service.sendChatAction('upload_photo')).resolves.toBe(true);
    });
  });

  // ─── Location ────────────────────────────────────────────────────────────────

  describe('sendLocation', () => {
    it('should send a location', async () => {
      const msg = await service.sendLocation(52.52, 13.405, {
        disable_notification: true,
      });

      expect(msg.message_id).toBeDefined();
    });

    it('should send a location with horizontal accuracy', async () => {
      const msg = await service.sendLocation(51.5074, -0.1278, {
        horizontal_accuracy: 50,
        disable_notification: true,
      });

      expect(msg.message_id).toBeDefined();
    });
  });

  // ─── Poll ────────────────────────────────────────────────────────────────────

  describe('sendPoll / stopPoll', () => {
    it('should send and stop a poll', async () => {
      const msg = await service.sendPoll(
        'e2e test poll — pick one',
        ['Option A', 'Option B', 'Option C'],
        { disable_notification: true, is_anonymous: true },
      );

      expect(msg.message_id).toBeDefined();

      const stopped = await service.stopPoll(msg.message_id);

      expect(stopped.is_closed).toBe(true);
    });

    it('should send a quiz poll', async () => {
      const msg = await service.sendPoll(
        'e2e quiz — what is 2+2?',
        ['3', '4', '5'],
        {
          type: 'quiz',
          correct_option_id: 1,
          disable_notification: true,
          is_anonymous: true,
        },
      );

      expect(msg.message_id).toBeDefined();

      await service.stopPoll(msg.message_id);
    });
  });

  // ─── Forward & Copy ──────────────────────────────────────────────────────────

  describe('forwardMessage / copyMessage', () => {
    it('should forward a message within the same chat', async () => {
      const original = await service.sendMessage('e2e test — to be forwarded', {
        disable_notification: true,
      });

      const forwarded = await service.forwardMessage(
        original.message_id,
        original.chat.id,
        undefined,
        { disable_notification: true },
      );

      expect(forwarded.message_id).not.toBe(original.message_id);
    });

    it('should copy a message without the forwarded header', async () => {
      const original = await service.sendMessage('e2e test — to be copied', {
        disable_notification: true,
      });

      const copied = await service.copyMessage(
        original.message_id,
        original.chat.id,
        undefined,
        { disable_notification: true },
      );

      expect(copied.message_id).toBeDefined();
    });
  });

  // ─── Updates ─────────────────────────────────────────────────────────────────

  describe('getUpdates', () => {
    it('should return an array of updates', async () => {
      const updates = await service.getUpdates({ limit: 5 });

      expect(Array.isArray(updates)).toBe(true);
    });
  });
});
