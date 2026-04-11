import { OrganizationId } from '../../domains/organization/organization.js'
import { InternalException } from '../../domains/commons/exceptions.js'
import { IFunctionRequestContext } from '../../domains/commons/IFunctionRequestContext.js'
import { IUserRepository, IUserOrganizationRepository, IUserNotificationRepository } from '../../domains/user/repositories/index.js'
import { Email, User, UserId, UserName } from '../../domains/user/user.js'
import { KeycloakGateway } from '../../runtime/keycloakGateway.js'

export class KeycloakUserRepository implements IUserRepository, IUserOrganizationRepository, IUserNotificationRepository {
  constructor(
    private readonly gateway: KeycloakGateway,
    private readonly context: IFunctionRequestContext,
  ) {}

  async create(name: UserName, email: Email): Promise<UserId> {
    const result = await this.gateway.client.users.create({
      username: name.value,
      email: email.value,
    })

    return new UserId(result.id)
  }

  async findByEmail(_email: Email): Promise<User | undefined> {
    throw new InternalException('Method not implemented.')
  }

  async findById(_id: UserId): Promise<User | undefined> {
    throw new InternalException('Method not implemented.')
  }

  async joinOrganization(_id: UserId, _orgId: OrganizationId): Promise<void> {
    throw new InternalException('Method not implemented.')
  }

  async invite(_id: UserId, _orgId: OrganizationId): Promise<void> {
    throw new InternalException('Method not implemented.')
  }

  async verifyEmail(_id: UserId): Promise<void> {
    throw new InternalException('Method not implemented.')
  }
}
