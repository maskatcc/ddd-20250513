import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { commonMiddleware } from '../../middleware/commonMiddleware.js'
import { refreshGateway } from '../../middleware/refreshGateway.js'
import { FunctionModuleContext } from '../../runtime/functionModuleContext.js'
import { requireRequestContext } from '../../runtime/functionRequestContext.js'
import { PostgresqlGateway, PostgresqlConfig } from '../../runtime/postgresqlGateway.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { queryUsers, QueryUsersDepsFactory } from '../../functions/userLogic/queryUsers.js'
import { PostgresqlUserQueryRepository } from '../../infrastructures/postgresql/postgresqlUserQueryRepository.js'
import { QueryUsersEvent, QueryUsersEventSchema } from './schema.js'
import { httpValue, throwHttpError, DomainErrorStatusMap } from '../commons/httpResponse.js'

// モジュールスコープで初期化（warm invocationで再利用）
const moduleContext = await FunctionModuleContext.create()
const postgresqlGateway = new PostgresqlGateway(await PostgresqlConfig.fromEnvironment())

const depsFactory: QueryUsersDepsFactory = (context) => ({
  userQueryService: new PostgresqlUserQueryRepository(postgresqlGateway, context),
})

async function lambdaHandler(event: QueryUsersEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const context = requireRequestContext(lambdaContext)
  const { context: authorizerContext } = context.getAuthorizer<{ context: { organizationId: string } }>()
  const input = {
    organizationId: new OrganizationId(authorizerContext.organizationId),
  }
  const result = await queryUsers(depsFactory)(context, input)
  if (!result.successful) {
    throwHttpError(result.domainError, {} satisfies DomainErrorStatusMap<never>)
  }

  return httpValue({ users: result.domainValue })
}

export const handler = commonMiddleware<QueryUsersEvent>(moduleContext)
  .use(refreshGateway(postgresqlGateway))
  .use(parser({ schema: QueryUsersEventSchema }))
  .handler(lambdaHandler)
