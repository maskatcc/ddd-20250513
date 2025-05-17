import { Pool as PostgresPool } from 'pg'

const DB_HOST = 'https://your-postgresql-host'
const DB_PORT = 5432
const DB_DATABASE = 'keycloak'
const DB_USER = 'postgres'
const DB_PASSWORD = 'SECRET_PASSWORD'

export class PostgresqlLib {
  readonly client: PostgresPool

  constructor(client?: PostgresPool) {
    if (client) {
      this.client = client
      return
    }

    this.client = new PostgresPool({
      host: process.env.DB_HOST ?? DB_HOST,
      port: (process.env.DB_PORT ?? DB_PORT) as number,
      database: process.env.DB_DATABASE ?? DB_DATABASE,
      user: process.env.DB_USER ?? DB_USER,
      password: process.env.DB_PASSWORD ?? DB_PASSWORD,
    })
  }
}
