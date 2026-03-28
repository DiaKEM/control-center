import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { SetupService } from './setup.service';

class InstallDto {
  username!: string;
  password!: string;
}

class SetupStatusDto {
  installed!: boolean;
}

@ApiTags('setup')
@Public()
@Controller('/api/setup')
export class SetupController {
  constructor(private readonly setup: SetupService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check whether the application has been set up' })
  @ApiOkResponse({ type: SetupStatusDto })
  async status(): Promise<SetupStatusDto> {
    return { installed: await this.setup.isInstalled() };
  }

  @Post('install')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create the first admin user and return a JWT' })
  async install(@Body() body: InstallDto) {
    return this.setup.install(body.username, body.password);
  }
}
