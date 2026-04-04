import { Pool as PostgresPool } from 'pg'
import { PostgresqlConfig } from './postgresqlConfig.js'
export { PostgresqlConfig } from './postgresqlConfig.js'

export class PostgresqlGateway {
  readonly client: PostgresPool

  constructor(config: PostgresqlConfig) {
    this.client = new PostgresPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    })
  }
}
