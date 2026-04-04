import { OrganizationId } from '../../domains/organization/organization.js'
import { QueryUserRecord, PostgresqlUserQueryRepository } from '../../infrastructures/postgresql/postgresqlUserQueryRepository.js'
import { FunctionContext } from '../../runtime/functionContext.js'

export async function queryUsers(args: { organizationId: OrganizationId }, context: FunctionContext): Promise<QueryUserRecord[]> {
  return await new PostgresqlUserQueryRepository(context).query(args.organizationId)
}
