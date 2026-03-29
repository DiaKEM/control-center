import { PushoverService, PushoverPriority } from './pushover.service';
import { ConfigService } from '@nestjs/config';

jest.mock('axios', () => ({
  create: jest.fn().mockReturnValue({
    get: jest.fn(),
    post: jest.fn(),
  }),
}));

import axios from 'axios';

const makeConfigService = () =>
  ({
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'PUSHOVER_APP_TOKEN') return 'app-token';
      if (key === 'PUSHOVER_USER_KEY') return 'user-key';
      return '';
    }),
  }) as unknown as ConfigService;

describe('PushoverService', () => {
  let service: PushoverService;
  let client: { get: jest.Mock; post: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    (axios.create as jest.Mock).mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn().mockResolvedValue({ data: {} }),
    });
    service = new PushoverService(makeConfigService());
    client = (axios.create as jest.Mock).mock.results.at(-1)!.value;
  });

  describe('isConnected()', () => {
    it('returns true when validate returns status 1', async () => {
      client.post.mockResolvedValue({
        data: { status: 1, request: 'r', group: 0, devices: [], licenses: [] },
      });
      expect(await service.isConnected()).toBe(true);
    });

    it('returns false when validate returns status 0', async () => {
      client.post.mockResolvedValue({
        data: { status: 0, request: 'r', group: 0, devices: [], licenses: [] },
      });
      expect(await service.isConnected()).toBe(false);
    });

    it('returns false on error', async () => {
      client.post.mockRejectedValue(new Error('network'));
      expect(await service.isConnected()).toBe(false);
    });
  });

  describe('sendMessage()', () => {
    it('calls POST /messages.json with token and user', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      const result = await service.sendMessage({
        message: 'Hello',
        priority: PushoverPriority.Normal,
      });
      expect(client.post).toHaveBeenCalledWith(
        '/messages.json',
        expect.objectContaining({
          token: 'app-token',
          user: 'user-key',
          message: 'Hello',
        }),
      );
      expect(result).toEqual({ status: 1, request: 'r' });
    });

    it('uses msg.user override when provided', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      await service.sendMessage({ message: 'Hi', user: 'custom-user' });
      expect(client.post).toHaveBeenCalledWith(
        '/messages.json',
        expect.objectContaining({
          user: 'custom-user',
        }),
      );
    });
  });

  describe('validateUser()', () => {
    it('calls POST /users/validate.json', async () => {
      client.post.mockResolvedValue({
        data: { status: 1, request: 'r', group: 0, devices: [], licenses: [] },
      });
      await service.validateUser();
      expect(client.post).toHaveBeenCalledWith(
        '/users/validate.json',
        expect.objectContaining({
          token: 'app-token',
          user: 'user-key',
        }),
      );
    });

    it('uses override userKey and device when provided', async () => {
      client.post.mockResolvedValue({
        data: { status: 1, request: 'r', group: 0, devices: [], licenses: [] },
      });
      await service.validateUser('other-key', 'iphone');
      expect(client.post).toHaveBeenCalledWith(
        '/users/validate.json',
        expect.objectContaining({
          user: 'other-key',
          device: 'iphone',
        }),
      );
    });
  });

  describe('getReceipt()', () => {
    it('calls GET /receipts/:receipt.json', async () => {
      client.get.mockResolvedValue({ data: { status: 1 } });
      await service.getReceipt('receipt-id');
      expect(client.get).toHaveBeenCalledWith(
        '/receipts/receipt-id.json',
        expect.any(Object),
      );
    });
  });

  describe('cancelEmergency()', () => {
    it('calls POST /receipts/:receipt/cancel.json', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      await service.cancelEmergency('receipt-id');
      expect(client.post).toHaveBeenCalledWith(
        '/receipts/receipt-id/cancel.json',
        expect.objectContaining({
          token: 'app-token',
        }),
      );
    });
  });

  describe('getSounds()', () => {
    it('calls GET /sounds.json', async () => {
      client.get.mockResolvedValue({
        data: { status: 1, request: 'r', sounds: {} },
      });
      await service.getSounds();
      expect(client.get).toHaveBeenCalledWith(
        '/sounds.json',
        expect.any(Object),
      );
    });
  });

  describe('getGroup()', () => {
    it('calls GET /groups/:groupKey.json', async () => {
      client.get.mockResolvedValue({
        data: { status: 1, name: 'g', users: [], request: 'r' },
      });
      await service.getGroup('grp-key');
      expect(client.get).toHaveBeenCalledWith(
        '/groups/grp-key.json',
        expect.any(Object),
      );
    });
  });

  describe('addUserToGroup()', () => {
    it('calls POST /groups/:groupKey/add_user.json', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      await service.addUserToGroup('grp-key', 'user-key');
      expect(client.post).toHaveBeenCalledWith(
        '/groups/grp-key/add_user.json',
        expect.objectContaining({
          user: 'user-key',
        }),
      );
    });
  });

  describe('removeUserFromGroup()', () => {
    it('calls POST /groups/:groupKey/delete_user.json', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      await service.removeUserFromGroup('grp-key', 'user-key');
      expect(client.post).toHaveBeenCalledWith(
        '/groups/grp-key/delete_user.json',
        expect.any(Object),
      );
    });
  });

  describe('disableGroupUser()', () => {
    it('calls POST /groups/:groupKey/disable_user.json', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      await service.disableGroupUser('grp-key', 'user-key');
      expect(client.post).toHaveBeenCalledWith(
        '/groups/grp-key/disable_user.json',
        expect.any(Object),
      );
    });
  });

  describe('enableGroupUser()', () => {
    it('calls POST /groups/:groupKey/enable_user.json', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      await service.enableGroupUser('grp-key', 'user-key');
      expect(client.post).toHaveBeenCalledWith(
        '/groups/grp-key/enable_user.json',
        expect.any(Object),
      );
    });
  });

  describe('updateGlance()', () => {
    it('calls POST /glances.json with token and user', async () => {
      client.post.mockResolvedValue({ data: { status: 1, request: 'r' } });
      await service.updateGlance({ title: 'Status', count: 3 });
      expect(client.post).toHaveBeenCalledWith(
        '/glances.json',
        expect.objectContaining({
          token: 'app-token',
          user: 'user-key',
          title: 'Status',
          count: 3,
        }),
      );
    });
  });
});
