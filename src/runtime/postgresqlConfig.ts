export class PostgresqlConfig {
  constructor(
    readonly host: string,
    readonly port: number,
    readonly database: string,
    readonly user: string,
    readonly password: string,
  ) {}

  static async fromEnvironment(): Promise<PostgresqlConfig> {
    return new PostgresqlConfig(
      process.env.DB_HOST ?? 'https://your-postgresql-host',
      Number(process.env.DB_PORT ?? 5432),
      process.env.DB_DATABASE ?? 'keycloak',
      process.env.DB_USER ?? 'postgres',
      process.env.DB_PASSWORD ?? 'SECRET_PASSWORD',
    )
  }
}
