import { OrganizationId } from '../../domains/organization/organization.js'
import { InternalException } from '../../domains/commons/exceptions.js'
import { IFunctionRequestContext } from '../../domains/commons/IFunctionRequestContext.js'
import { IUserQueryService, type UserQueryResult } from '../../domains/user/repositories/IUserQueryService.js'
import { PostgresqlGateway } from '../../runtime/postgresqlGateway.js'

export class PostgresqlUserQueryRepository implements IUserQueryService {
  constructor(
    private readonly gateway: PostgresqlGateway,
    private readonly context: IFunctionRequestContext,
  ) {}

  async query(_orgId: OrganizationId): Promise<UserQueryResult[]> {
    throw new InternalException('Method not implemented.')
  }
}
