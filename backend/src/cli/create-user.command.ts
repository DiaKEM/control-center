import { Command, CommandRunner, Option } from 'nest-commander';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user.schema';

interface CreateUserOptions {
  roles: UserRole[];
}

@Command({
  name: 'create-user',
  arguments: '<username> <password>',
  description: 'Create a new user with the given username and password',
})
export class CreateUserCommand extends CommandRunner {
  /* c8 ignore next */
  constructor(private readonly users: UsersService) {
    super();
  }

  async run(
    [username, password]: string[],
    options: CreateUserOptions,
  ): Promise<void> {
    const user = await this.users.create(username, password, options.roles);
    console.log(
      `User "${user.username}" created with roles: ${user.roles.join(', ')}`,
    );
  }

  @Option({
    flags: '-r, --roles <roles>',
    description:
      'Comma-separated list of roles to assign (admin, user). Defaults to "user".',
    defaultValue: 'user',
  })
  parseRoles(value: string): UserRole[] {
    return value.split(',').map((r) => r.trim() as UserRole);
  }
}
