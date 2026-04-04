import middy from '@middy/core'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Logger } from '@aws-lambda-powertools/logger'
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware'
import { Tracer } from '@aws-lambda-powertools/tracer'
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware'
import { Metrics } from '@aws-lambda-powertools/metrics'
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { createFunctionRequestContext } from '../../runtime/functionRequestContext.js'
import { PostgresqlGateway, PostgresqlConfig } from '../../runtime/postgresqlGateway.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { queryUsers, QueryUsersDeps } from '../../functions/userLogic/queryUsers.js'
import { PostgresqlUserQueryRepository } from '../../infrastructures/postgresql/postgresqlUserQueryRepository.js'
import { QueryUsersEvent, QueryUsersEventSchema } from './schema.js'

// モジュールスコープで初期化（warm invocationで再利用）
const logger = new Logger()
const tracer = new Tracer()
const metrics = new Metrics()

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

  const context = createFunctionRequestContext(lambdaContext, logger, tracer, metrics)
  const deps: QueryUsersDeps = {
    userQueryService: new PostgresqlUserQueryRepository(cachedGateway, context),
  }
  const users = await queryUsers(input, deps)

  return {
    statusCode: 200,
    body: JSON.stringify({ users }),
  }
}

export const handler = middy()
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(parser({ schema: QueryUsersEventSchema }))
  .handler(lambdaHandler)
