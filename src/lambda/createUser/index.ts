import middy from '@middy/core'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { createFunctionRequestContext } from '../../runtime/functionRequestContext.js'
import { KeycloakGateway, KeycloakConfig } from '../../runtime/keycloakGateway.js'
import { createUser, CreateUserDeps } from '../../functions/userLogic/createUser.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserName } from '../../domains/user/user.js'
import { KeycloakUserRepository } from '../../infrastructures/keycloak/keycloakUserRepository.js'
import { ILogger, ITracer, IMetrics } from '../../domains/commons/IFunctionRequestContext.js'
import { CreateUserEvent, CreateUserEventSchema } from './schema.js'

// TODO: PowerTools Logger/Tracer/Metrics に置き換える
const logger: ILogger = { info: () => {}, warn: () => {}, error: () => {} }
const tracer: ITracer = { getSegment: () => undefined, setSegment: () => {}, addAnnotation: () => {}, addMetadata: () => {} }
const metrics: IMetrics = { addMetric: () => {}, addDimension: () => {} }

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

  const context = createFunctionRequestContext(lambdaContext, logger, tracer, metrics)
  const keycloakUserRepository = new KeycloakUserRepository(cachedGateway, context)
  const deps: CreateUserDeps = {
    userRepository: keycloakUserRepository,
    userOrganizationRepository: keycloakUserRepository,
    userNotificationRepository: keycloakUserRepository,
  }
  const userId = await createUser(input, deps)

  return {
    statusCode: 200,
    body: JSON.stringify({ userId: userId.value }),
  }
}

export const handler = middy()
  .use(parser({ schema: CreateUserEventSchema }))
  .handler(lambdaHandler)
