import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserOrganizationRepository } from '../../domains/user/repositories/IUserOrganizationRepository.js'
import { UserId } from '../../domains/user/user.js'
import { FunctionContext, KeycloakLib } from '../../runtime/functionContext.js'

export class KeycloakUserOrganizationRepository implements IUserOrganizationRepository {
  readonly keycloak: KeycloakLib

  constructor(private readonly context: FunctionContext) {
    this.keycloak = context.keycloak
  }

  async joinOrganization(_id: UserId, _orgId: OrganizationId): Promise<void> {
    throw new Error('Method not implemented.')
  }
}
