import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserQueryService, UserQueryResult } from '../../domains/user/repositories/index.js'

export type QueryUsersDeps = {
  userQueryService: IUserQueryService
}

export async function queryUsers(args: { organizationId: OrganizationId }, deps: QueryUsersDeps): Promise<UserQueryResult[]> {
  return await deps.userQueryService.query(args.organizationId)
}
