import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserQueryService, UserQueryResult } from '../../domains/user/repositories/index.js'
import { IFunctionRequestContext } from '../../domains/commons/IFunctionRequestContext.js'
import { DomainResult, succeed } from '../../domains/commons/DomainResult.js'

export type QueryUsersDeps = {
  userQueryService: IUserQueryService
}

export type QueryUsersDepsFactory = (context: IFunctionRequestContext) => QueryUsersDeps

export type QueryUsersInput = {
  organizationId: OrganizationId
}

export function queryUsers(depsFactory: QueryUsersDepsFactory) {
  return async (context: IFunctionRequestContext, input: QueryUsersInput): Promise<DomainResult<UserQueryResult[], never>> => {
    const { userQueryService } = depsFactory(context)
    return succeed(await userQueryService.query(input.organizationId))
  }
}
