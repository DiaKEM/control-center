import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

class LoginDto {
  username!: string;
  password!: string;
}

class UserDto {
  id!: string;
  username!: string;
}

class LoginResponseDto {
  access_token!: string;
  user!: UserDto;
}

@ApiTags('auth')
@Controller('/api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and obtain a JWT access token' })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() body: LoginDto): Promise<LoginResponseDto> {
    return this.auth.login(body.username, body.password);
  }
}
