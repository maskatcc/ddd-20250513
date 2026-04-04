import middy from '@middy/core'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { createFunctionRequestContext } from '../../runtime/functionRequestContext.js'
import { PostgresqlGateway, PostgresqlConfig } from '../../runtime/postgresqlGateway.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { queryUsers, QueryUsersDeps } from '../../functions/userLogic/queryUsers.js'
import { PostgresqlUserQueryRepository } from '../../infrastructures/postgresql/postgresqlUserQueryRepository.js'
import { ILogger, ITracer, IMetrics } from '../../domains/commons/IFunctionRequestContext.js'
import { QueryUsersEvent, QueryUsersEventSchema } from './schema.js'

// TODO: PowerTools Logger/Tracer/Metrics に置き換える
const logger: ILogger = { info: () => {}, warn: () => {}, error: () => {} }
const tracer: ITracer = { getSegment: () => undefined, setSegment: () => {}, addAnnotation: () => {}, addMetadata: () => {} }
const metrics: IMetrics = { addMetric: () => {}, addDimension: () => {} }

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
  .use(parser({ schema: QueryUsersEventSchema }))
  .handler(lambdaHandler)
