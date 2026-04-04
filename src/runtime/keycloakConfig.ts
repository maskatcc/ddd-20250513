export class KeycloakConfig {
  constructor(
    readonly baseUrl: string,
    readonly realm: string,
    readonly clientId: string,
    readonly clientSecret: string,
  ) {}

  static async fromEnvironment(): Promise<KeycloakConfig> {
    return new KeycloakConfig(
      process.env.KEYCLOAK_URL ?? 'https://your-keycloak-server-url',
      process.env.KEYCLOAK_REALM ?? 'pcaid',
      process.env.KEYCLOAK_CLIENT_ID ?? 'your-client-id',
      process.env.KEYCLOAK_CLIENT_SECRET ?? 'your-client-secret',
    )
  }
}
