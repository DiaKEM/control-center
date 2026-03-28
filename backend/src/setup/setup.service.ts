import { ConflictException, Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class SetupService {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  async isInstalled(): Promise<boolean> {
    const all = await this.users.findAll();
    return all.length > 0;
  }

  async install(
    username: string,
    password: string,
  ): Promise<{ access_token: string; user: { id: string; username: string } }> {
    if (await this.isInstalled()) {
      throw new ConflictException('Application is already installed');
    }
    await this.users.create(username, password, ['admin', 'user']);
    return this.auth.login(username, password);
  }
}
