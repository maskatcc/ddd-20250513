import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserRepository, IUserOrganizationRepository, IUserNotificationRepository } from '../../domains/user/repositories/index.js'
import { Email, User, UserId, UserName } from '../../domains/user/user.js'
import { FunctionContext, KeycloakLib } from '../../runtime/functionContext.js'

export class KeycloakUserRepository implements IUserRepository, IUserOrganizationRepository, IUserNotificationRepository {
  readonly keycloak: KeycloakLib

  constructor(private readonly context: FunctionContext) {
    this.keycloak = context.keycloak
  }

  async create(name: UserName, email: Email): Promise<UserId> {
    const result = await this.keycloak.client.users.create({
      username: name.value,
      email: email.value,
    })

    return new UserId(result.id)
  }

  async findByEmail(_email: Email): Promise<User | undefined> {
    throw new Error('Method not implemented.')
  }

  async findById(_id: UserId): Promise<User | undefined> {
    throw new Error('Method not implemented.')
  }

  async joinOrganization(_id: UserId, _orgId: OrganizationId): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async invite(_id: UserId, _orgId: OrganizationId): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async verifyEmail(_id: UserId): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
