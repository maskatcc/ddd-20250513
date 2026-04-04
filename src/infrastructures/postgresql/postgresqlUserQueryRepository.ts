import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserQueryService, type UserQueryResult } from '../../domains/user/repositories/IUserQueryService.js'
import { FunctionContext, PostgresqlLib } from '../../runtime/functionContext.js'

/** @deprecated ドメイン層の UserQueryResult を使用してください */
export type QueryUserRecord = UserQueryResult

export class PostgresqlUserQueryRepository implements IUserQueryService {
  readonly postgresql: PostgresqlLib

  constructor(private readonly context: FunctionContext) {
    if ((process.env.NODE_ENV || process.env.DB_ENV) && !context.postgresql) {
      throw new Error('Postgresql is not initialized.')
    }
    this.postgresql = context.postgresql!
  }

  async query(_orgId: OrganizationId): Promise<UserQueryResult[]> {
    throw new Error('Method not implemented.')
  }
}
