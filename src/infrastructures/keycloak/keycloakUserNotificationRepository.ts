import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserNotificationRepository } from '../../domains/user/repositories/IUserNotificationRepository.js'
import { UserId } from '../../domains/user/user.js'
import { FunctionContext, KeycloakLib } from '../../runtime/functionContext.js'

export class KeycloakUserNotificationRepository implements IUserNotificationRepository {
  readonly keycloak: KeycloakLib

  constructor(private readonly context: FunctionContext) {
    this.keycloak = context.keycloak
  }

  async invite(_id: UserId, _orgId: OrganizationId): Promise<void> {
    throw new Error('Method not implemented.')
  }

  async verifyEmail(_id: UserId): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
