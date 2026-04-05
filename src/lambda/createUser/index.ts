import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware'
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware'
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { FunctionModuleContext } from '../../runtime/functionModuleContext.js'
import { createRequestContext } from '../../runtime/functionRequestContext.js'
import { KeycloakGateway, KeycloakConfig } from '../../runtime/keycloakGateway.js'
import { createUser, CreateUserDeps } from '../../functions/userLogic/createUser.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserName } from '../../domains/user/user.js'
import { KeycloakUserRepository } from '../../infrastructures/keycloak/keycloakUserRepository.js'
import { CreateUserEvent, CreateUserEventSchema } from './schema.js'
import { zodParseErrorHandler } from '../commons/zodParseErrorHandler.js'
import { httpValue } from '../commons/httpResponse.js'

// モジュールスコープで初期化（warm invocationで再利用）
const moduleContext = await FunctionModuleContext.create()
const { logger, tracer, metrics } = moduleContext

// モジュールスコープキャッシュ（warm invocationで再利用）
let cachedGateway: KeycloakGateway | undefined

async function lambdaHandler(event: CreateUserEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const authorizer = event.requestContext.authorizer.lambda
  const input = {
    organizationId: new OrganizationId(authorizer.context.organizationId),
    email: new Email(event.body.email),
    userName: new UserName(event.body.userName),
  }

  if (!cachedGateway) {
    const config = await KeycloakConfig.fromEnvironment()
    cachedGateway = new KeycloakGateway(config)
  }

  const context = createRequestContext(moduleContext, lambdaContext)
  const keycloakUserRepository = new KeycloakUserRepository(cachedGateway, context)
  const deps: CreateUserDeps = {
    userRepository: keycloakUserRepository,
    userOrganizationRepository: keycloakUserRepository,
    userNotificationRepository: keycloakUserRepository,
  }
  const userId = await createUser(input, deps)

  return httpValue({ userId: userId.value })
}

export const handler = middy()
  .use(httpErrorHandler({ logger: error => logger.error('Unhandled error', { error }) }))
  .use(zodParseErrorHandler())
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(parser({ schema: CreateUserEventSchema }))
  .handler(lambdaHandler)
