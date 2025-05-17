import { Email, UserId, UserName } from '../../domains/user/user.js'
import { FunctionContext, KeycloakLib } from '../../runtime/functionContext.js'

export class UserCreateRepository {
  readonly keycloak: KeycloakLib

  constructor(private readonly context: FunctionContext) {
    this.keycloak = context.keycloak
  }

  async create(name: UserName, email: Email): Promise<UserId> {
    // UserRepresentation {
    //     id?: string;
    //     createdTimestamp?: number;
    //     username?: string;
    //     enabled?: boolean;
    //     totp?: boolean;
    //     emailVerified?: boolean;
    //     disableableCredentialTypes?: string[];
    //     requiredActions?: (RequiredActionAlias | string)[];
    //     notBefore?: number;
    //     access?: Record<string, boolean>;
    //     attributes?: Record<string, any>;
    //     clientConsents?: UserConsentRepresentation[];
    //     clientRoles?: Record<string, any>;
    //     credentials?: CredentialRepresentation[];
    //     email?: string;
    //     federatedIdentities?: FederatedIdentityRepresentation[];
    //     federationLink?: string;
    //     firstName?: string;
    //     groups?: string[];
    //     lastName?: string;
    //     realmRoles?: string[];
    //     self?: string;
    //     serviceAccountClientId?: string;
    //     userProfileMetadata?: UserProfileMetadata;
    // }

    const result = await this.keycloak.client.users.create({
      username: name.value,
      email: email.value,
    })

    return new UserId(result.id)
  }
}
