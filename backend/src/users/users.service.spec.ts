import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './user.schema';
import * as bcrypt from 'bcryptjs';

const mockUser = {
  username: 'alice',
  password: 'hashed',
  roles: ['user'],
  save: jest.fn(),
};

// Mock bcrypt at module level
jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed')),
  compare: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;

  function ModelConstructor(dto: unknown) {
    return { ...dto, save: jest.fn().mockResolvedValue(mockUser) };
  }
  ModelConstructor.findOne = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: ModelConstructor },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('findByUsername', () => {
    it('returns user when found', async () => {
      ModelConstructor.findOne.mockReturnValue({
        exec: () => Promise.resolve(mockUser),
      });
      const result = await service.findByUsername('alice');
      expect(result).toBe(mockUser);
    });

    it('returns null when not found', async () => {
      ModelConstructor.findOne.mockReturnValue({
        exec: () => Promise.resolve(null),
      });
      const result = await service.findByUsername('unknown');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('throws ConflictException when username already exists', async () => {
      ModelConstructor.findOne.mockReturnValue({
        exec: () => Promise.resolve(mockUser),
      });
      await expect(service.create('alice', 'pass')).rejects.toThrow(
        ConflictException,
      );
    });

    it('creates user with hashed password', async () => {
      ModelConstructor.findOne.mockReturnValue({
        exec: () => Promise.resolve(null),
      });
      await service.create('bob', 'password');
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 10);
    });
  });

  describe('validatePassword', () => {
    it('returns true when passwords match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      expect(await service.validatePassword('plain', 'hashed')).toBe(true);
    });

    it('returns false when passwords do not match', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      expect(await service.validatePassword('wrong', 'hashed')).toBe(false);
    });
  });
});
