import { OrganizationId } from '../../domains/organization/organization.js'
import { QueryUserRecord, UserQueryRepository } from '../../infrastructures/postgresql/userQueryRepository.js'
import { FunctionContext } from '../../runtime/functionContext.js'

export async function queryUser(args: { organizationId: OrganizationId }, context: FunctionContext): Promise<QueryUserRecord[]> {
  return await new UserQueryRepository(context).query(args.organizationId)
}
