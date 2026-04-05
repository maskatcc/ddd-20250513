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
import { queryUsers, QueryUsersDeps } from '../../functions/userLogic/queryUsers.js'
import { PostgresqlUserQueryRepository } from '../../infrastructures/postgresql/postgresqlUserQueryRepository.js'
import { QueryUsersEvent, QueryUsersEventSchema } from './schema.js'
import { zodParseErrorHandler } from '../commons/zodParseErrorHandler.js'
import { httpValue } from '../commons/httpResponse.js'

// モジュールスコープで初期化（warm invocationで再利用）
const moduleContext = await FunctionModuleContext.create()
const { logger, tracer, metrics } = moduleContext

// モジュールスコープキャッシュ（warm invocationで再利用）
let cachedGateway: PostgresqlGateway | undefined

async function lambdaHandler(event: QueryUsersEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const authorizer = event.requestContext.authorizer.lambda
  const input = {
    organizationId: new OrganizationId(authorizer.context.organizationId),
  }

  if (!cachedGateway) {
    const config = await PostgresqlConfig.fromEnvironment()
    cachedGateway = new PostgresqlGateway(config)
  }

  const context = createRequestContext(moduleContext, lambdaContext)
  const deps: QueryUsersDeps = {
    userQueryService: new PostgresqlUserQueryRepository(cachedGateway, context),
  }
  const users = await queryUsers(input, deps)

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
