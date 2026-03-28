import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';
import { ConfigService } from '@nestjs/config';

const makeContext = (apiKey?: string) => ({
  switchToHttp: () => ({
    getRequest: () => ({ headers: { 'x-api-key': apiKey } }),
  }),
});

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let config: ConfigService;

  beforeEach(() => {
    config = {
      getOrThrow: jest.fn().mockReturnValue('secret-key'),
    } as unknown as ConfigService;
    guard = new ApiKeyGuard(config);
  });

  it('returns true when the API key is correct', () => {
    expect(guard.canActivate(makeContext('secret-key') as any)).toBe(true);
  });

  it('throws UnauthorizedException when API key is wrong', () => {
    expect(() => guard.canActivate(makeContext('wrong-key') as any)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when API key is missing', () => {
    expect(() => guard.canActivate(makeContext(undefined) as any)).toThrow(UnauthorizedException);
  });
});
