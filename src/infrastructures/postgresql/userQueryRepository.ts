import { OrganizationId } from '../../domains/organization/organization.js'
import { FunctionContext, PostgresqlLib } from '../../runtime/functionContext.js'

export type QueryUserRecord = {
  userId: string
  userName: string
  email: string
}

export class UserQueryRepository {
  readonly postgresql: PostgresqlLib

  constructor(private readonly context: FunctionContext) {
    if ((process.env.NODE_ENV || process.env.DB_ENV) && !context.postgresql) {
      throw new Error('Postgresql is not initialized.')
    }
    this.postgresql = context.postgresql!
  }

  async query(_orgId: OrganizationId): Promise<QueryUserRecord[]> {
    throw new Error('Method not implemented.')
  }
}
