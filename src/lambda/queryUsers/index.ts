import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware'
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware'
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { FunctionModuleContext } from '../../runtime/functionModuleContext.js'
import { createRequestContext } from '../../runtime/functionRequestContext.js'
import { PostgresqlGateway, PostgresqlConfig } from '../../runtime/postgresqlGateway.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { queryUsers, QueryUsersDepsFactory } from '../../functions/userLogic/queryUsers.js'
import { PostgresqlUserQueryRepository } from '../../infrastructures/postgresql/postgresqlUserQueryRepository.js'
import { QueryUsersEvent, QueryUsersEventSchema } from './schema.js'
import { zodParseErrorHandler } from '../commons/zodParseErrorHandler.js'
import { httpValue } from '../commons/httpResponse.js'

// モジュールスコープで初期化（warm invocationで再利用）
const moduleContext = await FunctionModuleContext.create()
const { logger, tracer, metrics } = moduleContext

// モジュールスコープキャッシュ（warm invocationで再利用）
let cachedGateway: PostgresqlGateway | undefined

const depsFactory: QueryUsersDepsFactory = (context) => ({
  userQueryService: new PostgresqlUserQueryRepository(cachedGateway!, context),
})

async function lambdaHandler(event: QueryUsersEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  if (!cachedGateway) {
    cachedGateway = new PostgresqlGateway(await PostgresqlConfig.fromEnvironment())
  }

  const context = createRequestContext(moduleContext, lambdaContext)
  const authorizer = event.requestContext.authorizer.lambda
  const input = {
    organizationId: new OrganizationId(authorizer.context.organizationId),
  }
  const users = await queryUsers(depsFactory)(context, input)

  return httpValue({ users })
}

export const handler = middy()
  .use(httpErrorHandler({ logger: error => logger.error('Unhandled error', { error }) }))
  .use(zodParseErrorHandler())
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(parser({ schema: QueryUsersEventSchema }))
  .handler(lambdaHandler)
