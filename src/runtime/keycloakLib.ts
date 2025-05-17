import KcAdminClient from '@keycloak/keycloak-admin-client'

const KEYCLOAK_URL = 'https://your-keycloak-server-url'
const REALM = 'pcaid'
const CLIENT_ID = 'your-client-id'
const CLIENT_SECRET = 'your-client-secret'

export class KeycloakLib {
  constructor(public readonly client: KcAdminClient = new KcAdminClient()) {
    if (!process.env.KEYCLOAK_ENV || !KEYCLOAK_URL) {
      return
    }

    this.client.auth({
      grantType: 'client_credentials',
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    })

    this.client.setConfig({
      realmName: REALM,
    })
  }
}
