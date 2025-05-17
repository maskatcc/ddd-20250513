import { Email, User, UserId } from '../../domains/user/user.js'
import { FunctionContext, KeycloakLib } from '../../runtime/functionContext.js'

export class UserFindRepository {
  readonly keycloak: KeycloakLib

  constructor(private readonly context: FunctionContext) {
    this.keycloak = context.Keycloak
  }

  async findByEmail(_email: Email): Promise<User | undefined> {
    throw new Error('Method not implemented.')
  }

  async findById(_id: UserId): Promise<User | undefined> {
    throw new Error('Method not implemented.')
  }
}
