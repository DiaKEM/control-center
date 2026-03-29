import { TelegramService } from './telegram.service';
import { ConfigService } from '@nestjs/config';

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    post: jest.fn(),
  }),
}));

import axios from 'axios';

const makeConfigService = () =>
  ({
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'bot-token';
      if (key === 'TELEGRAM_CHAT_ID') return 'chat-123';
      return '';
    }),
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'bot-token';
      if (key === 'TELEGRAM_CHAT_ID') return 'chat-123';
      return '';
    }),
  }) as unknown as ConfigService;

const makeAdminSettings = () =>
  ({
    getSettings: jest.fn().mockResolvedValue(null),
  }) as any;

describe('TelegramService', () => {
  let service: TelegramService;
  let client: { post: jest.Mock };

  const okResponse = (result: unknown) => ({
    data: { ok: true, result },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({
      post: jest.fn().mockResolvedValue(okResponse({})),
    });
    service = new TelegramService(makeConfigService(), makeAdminSettings());
    await service.reinitialize();
    client = (axios.create as jest.Mock).mock.results.at(-1)!.value;
  });

  describe('isConnected()', () => {
    it('returns true when getMe and sendMessage succeed', async () => {
      client.post.mockResolvedValue(
        okResponse({ id: 1, is_bot: true, first_name: 'Bot' }),
      );
      expect(await service.isConnected()).toBe(true);
    });

    it('returns false on error', async () => {
      client.post.mockRejectedValue(new Error('network'));
      expect(await service.isConnected()).toBe(false);
    });
  });

  describe('getMe()', () => {
    it('calls getMe method', async () => {
      client.post.mockResolvedValue(
        okResponse({ id: 1, is_bot: true, first_name: 'Bot' }),
      );
      const result = await service.getMe();
      expect(client.post).toHaveBeenCalledWith('/getMe', {});
      expect(result).toEqual({ id: 1, is_bot: true, first_name: 'Bot' });
    });
  });

  describe('sendMessage()', () => {
    it('calls sendMessage with default chatId', async () => {
      const msg = { message_id: 1, chat: { id: 1, type: 'private' }, date: 0 };
      client.post.mockResolvedValue(okResponse(msg));
      await service.sendMessage('Hello');
      expect(client.post).toHaveBeenCalledWith(
        '/sendMessage',
        expect.objectContaining({
          chat_id: 'chat-123',
          text: 'Hello',
        }),
      );
    });

    it('uses override chat_id when provided', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendMessage('Hi', { chat_id: 'other-chat' });
      expect(client.post).toHaveBeenCalledWith(
        '/sendMessage',
        expect.objectContaining({
          chat_id: 'other-chat',
        }),
      );
    });

    it('sets link_preview_options when link_preview_disabled is true', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendMessage('Hi', { link_preview_disabled: true });
      expect(client.post).toHaveBeenCalledWith(
        '/sendMessage',
        expect.objectContaining({
          link_preview_options: { is_disabled: true },
        }),
      );
    });

    it('does not set link_preview_options when not disabled', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendMessage('Hi');
      const call = client.post.mock.calls[0][1];
      expect(call.link_preview_options).toBeUndefined();
    });
  });

  describe('editMessageText()', () => {
    it('calls editMessageText with correct params', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.editMessageText(42, 'New text');
      expect(client.post).toHaveBeenCalledWith(
        '/editMessageText',
        expect.objectContaining({
          chat_id: 'chat-123',
          message_id: 42,
          text: 'New text',
        }),
      );
    });

    it('sets link_preview_options when link_preview_disabled', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.editMessageText(42, 'text', {
        link_preview_disabled: true,
      });
      expect(client.post).toHaveBeenCalledWith(
        '/editMessageText',
        expect.objectContaining({
          link_preview_options: { is_disabled: true },
        }),
      );
    });
  });

  describe('deleteMessage()', () => {
    it('calls deleteMessage', async () => {
      client.post.mockResolvedValue(okResponse(true));
      await service.deleteMessage(42);
      expect(client.post).toHaveBeenCalledWith(
        '/deleteMessage',
        expect.objectContaining({
          chat_id: 'chat-123',
          message_id: 42,
        }),
      );
    });

    it('uses override chatId', async () => {
      client.post.mockResolvedValue(okResponse(true));
      await service.deleteMessage(42, 'other');
      expect(client.post).toHaveBeenCalledWith(
        '/deleteMessage',
        expect.objectContaining({
          chat_id: 'other',
        }),
      );
    });
  });

  describe('forwardMessage()', () => {
    it('calls forwardMessage', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.forwardMessage(42, 'from-chat');
      expect(client.post).toHaveBeenCalledWith(
        '/forwardMessage',
        expect.objectContaining({
          chat_id: 'chat-123',
          from_chat_id: 'from-chat',
          message_id: 42,
        }),
      );
    });
  });

  describe('copyMessage()', () => {
    it('calls copyMessage', async () => {
      client.post.mockResolvedValue(okResponse({ message_id: 99 }));
      await service.copyMessage(42, 'from-chat');
      expect(client.post).toHaveBeenCalledWith(
        '/copyMessage',
        expect.objectContaining({
          chat_id: 'chat-123',
          from_chat_id: 'from-chat',
          message_id: 42,
        }),
      );
    });
  });

  describe('sendPhoto()', () => {
    it('calls sendPhoto', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendPhoto('http://img.url/photo.jpg');
      expect(client.post).toHaveBeenCalledWith(
        '/sendPhoto',
        expect.objectContaining({
          chat_id: 'chat-123',
          photo: 'http://img.url/photo.jpg',
        }),
      );
    });
  });

  describe('sendDocument()', () => {
    it('calls sendDocument', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendDocument('http://doc.url/file.pdf');
      expect(client.post).toHaveBeenCalledWith(
        '/sendDocument',
        expect.objectContaining({
          document: 'http://doc.url/file.pdf',
        }),
      );
    });
  });

  describe('sendAudio()', () => {
    it('calls sendAudio', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendAudio('http://audio.url/track.mp3', { duration: 60 });
      expect(client.post).toHaveBeenCalledWith(
        '/sendAudio',
        expect.objectContaining({
          audio: 'http://audio.url/track.mp3',
          duration: 60,
        }),
      );
    });
  });

  describe('sendVideo()', () => {
    it('calls sendVideo', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendVideo('http://video.url/clip.mp4');
      expect(client.post).toHaveBeenCalledWith(
        '/sendVideo',
        expect.objectContaining({
          video: 'http://video.url/clip.mp4',
        }),
      );
    });
  });

  describe('sendAnimation()', () => {
    it('calls sendAnimation', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendAnimation('http://anim.url/anim.gif');
      expect(client.post).toHaveBeenCalledWith(
        '/sendAnimation',
        expect.objectContaining({
          animation: 'http://anim.url/anim.gif',
        }),
      );
    });
  });

  describe('sendLocation()', () => {
    it('calls sendLocation with lat/lng', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendLocation(51.5, -0.1);
      expect(client.post).toHaveBeenCalledWith(
        '/sendLocation',
        expect.objectContaining({
          chat_id: 'chat-123',
          latitude: 51.5,
          longitude: -0.1,
        }),
      );
    });
  });

  describe('sendPoll()', () => {
    it('calls sendPoll', async () => {
      client.post.mockResolvedValue(okResponse({}));
      await service.sendPoll('Favourite colour?', ['Red', 'Blue']);
      expect(client.post).toHaveBeenCalledWith(
        '/sendPoll',
        expect.objectContaining({
          question: 'Favourite colour?',
          options: ['Red', 'Blue'],
        }),
      );
    });
  });

  describe('stopPoll()', () => {
    it('calls stopPoll', async () => {
      client.post.mockResolvedValue(okResponse({ id: 1, is_closed: true }));
      await service.stopPoll(42);
      expect(client.post).toHaveBeenCalledWith(
        '/stopPoll',
        expect.objectContaining({
          chat_id: 'chat-123',
          message_id: 42,
        }),
      );
    });
  });

  describe('sendChatAction()', () => {
    it('calls sendChatAction with typing', async () => {
      client.post.mockResolvedValue(okResponse(true));
      await service.sendChatAction('typing');
      expect(client.post).toHaveBeenCalledWith(
        '/sendChatAction',
        expect.objectContaining({
          action: 'typing',
          chat_id: 'chat-123',
        }),
      );
    });
  });

  describe('pinMessage()', () => {
    it('calls pinChatMessage', async () => {
      client.post.mockResolvedValue(okResponse(true));
      await service.pinMessage(42);
      expect(client.post).toHaveBeenCalledWith(
        '/pinChatMessage',
        expect.objectContaining({
          message_id: 42,
          chat_id: 'chat-123',
          disable_notification: false,
        }),
      );
    });
  });

  describe('unpinMessage()', () => {
    it('calls unpinChatMessage', async () => {
      client.post.mockResolvedValue(okResponse(true));
      await service.unpinMessage(42);
      expect(client.post).toHaveBeenCalledWith(
        '/unpinChatMessage',
        expect.objectContaining({
          message_id: 42,
        }),
      );
    });
  });

  describe('unpinAllMessages()', () => {
    it('calls unpinAllChatMessages', async () => {
      client.post.mockResolvedValue(okResponse(true));
      await service.unpinAllMessages();
      expect(client.post).toHaveBeenCalledWith(
        '/unpinAllChatMessages',
        expect.objectContaining({
          chat_id: 'chat-123',
        }),
      );
    });
  });

  describe('getChat()', () => {
    it('calls getChat with default chatId', async () => {
      client.post.mockResolvedValue(okResponse({ id: 1, type: 'private' }));
      await service.getChat();
      expect(client.post).toHaveBeenCalledWith(
        '/getChat',
        expect.objectContaining({
          chat_id: 'chat-123',
        }),
      );
    });
  });

  describe('getChatMemberCount()', () => {
    it('calls getChatMemberCount', async () => {
      client.post.mockResolvedValue(okResponse(42));
      await service.getChatMemberCount();
      expect(client.post).toHaveBeenCalledWith(
        '/getChatMemberCount',
        expect.objectContaining({
          chat_id: 'chat-123',
        }),
      );
    });
  });

  describe('getChatMember()', () => {
    it('calls getChatMember with userId', async () => {
      client.post.mockResolvedValue(
        okResponse({
          status: 'member',
          user: { id: 1, is_bot: false, first_name: 'Test' },
        }),
      );
      await service.getChatMember(99);
      expect(client.post).toHaveBeenCalledWith(
        '/getChatMember',
        expect.objectContaining({
          user_id: 99,
          chat_id: 'chat-123',
        }),
      );
    });
  });

  describe('getUpdates()', () => {
    it('calls getUpdates', async () => {
      client.post.mockResolvedValue(okResponse([]));
      await service.getUpdates({ offset: 10, limit: 5 });
      expect(client.post).toHaveBeenCalledWith(
        '/getUpdates',
        expect.objectContaining({
          offset: 10,
          limit: 5,
        }),
      );
    });
  });
});
