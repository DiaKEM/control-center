import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { User, UserRole } from './user.schema';

class CreateUserDto {
  username!: string;
  password!: string;
  roles?: UserRole[];
}

class UpdateUserDto {
  roles?: UserRole[];
  password?: string;
}

@ApiTags('users')
@ApiSecurity('X-Api-Key')
@ApiBearerAuth()
@Roles('admin')
@Controller('/api/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ type: [User] })
  findAll() {
    return this.users.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiOkResponse({ type: User })
  create(@Body() body: CreateUserDto) {
    return this.users.create(body.username, body.password, body.roles);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user roles and/or password' })
  @ApiOkResponse({ type: User })
  update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.users.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiNoContentResponse()
  delete(@Param('id') id: string) {
    return this.users.delete(id);
  }
}
