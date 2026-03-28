import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/user.schema';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<UserDocument> {
    const user = await this.users.findByUsername(username);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await this.users.validatePassword(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string; user: { id: string; username: string } }> {
    const user = await this.validateUser(username, password);

    const id = user._id.toString();
    const payload: JwtPayload = { sub: id, username: user.username, roles: user.roles };

    return {
      access_token: this.jwt.sign(payload),
      user: { id, username: user.username },
    };
  }
}
