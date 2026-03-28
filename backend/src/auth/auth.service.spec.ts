import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockUser = {
  _id: 'user-id-1',
  username: 'alice',
  password: 'hashed',
  roles: ['user'],
};

const mockUsersService = {
  findByUsername: jest.fn(),
  validatePassword: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(() => 'jwt-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('throws when user not found', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      await expect(service.validateUser('unknown', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('throws when password is wrong', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(false);
      await expect(service.validateUser('alice', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('returns user when credentials are valid', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);
      const result = await service.validateUser('alice', 'correct');
      expect(result).toBe(mockUser);
    });
  });

  describe('login', () => {
    it('returns an access token on success', async () => {
      mockUsersService.findByUsername.mockResolvedValue(mockUser);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.login('alice', 'correct');

      expect(result).toEqual({
        access_token: 'jwt-token',
        user: { id: 'user-id-1', username: 'alice' },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-id-1',
        username: 'alice',
        roles: ['user'],
      });
    });

    it('throws UnauthorizedException on bad credentials', async () => {
      mockUsersService.findByUsername.mockResolvedValue(null);
      await expect(service.login('bad', 'creds')).rejects.toThrow(UnauthorizedException);
    });
  });
});
