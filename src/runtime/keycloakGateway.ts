import KcAdminClient from '@keycloak/keycloak-admin-client'
import { KeycloakConfig } from './keycloakConfig.js'

export class KeycloakGateway {
  readonly client: KcAdminClient

  constructor(config: KeycloakConfig) {
    this.client = new KcAdminClient()

    this.client.auth({
      grantType: 'client_credentials',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    })

    this.client.setConfig({
      realmName: config.realm,
    })
  }

  async refresh(): Promise<void> {
    // 将来: トークンの有効期限チェック・リフレッシュをここに追加
  }
}

export { KeycloakConfig }
