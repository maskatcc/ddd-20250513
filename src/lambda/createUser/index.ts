import middy from '@middy/core'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { createFunctionContext } from '../../runtime/functionContext.js'
import { createUser, CreateUserDeps } from '../../functions/userLogic/createUser.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserName } from '../../domains/user/user.js'
import { KeycloakUserRepository } from '../../infrastructures/keycloak/keycloakUserRepository.js'
import { CreateUserEvent, CreateUserEventSchema } from './schema.js'

async function lambdaHandler(event: CreateUserEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const authorizer = event.requestContext.authorizer.lambda
  const input = {
    organizationId: new OrganizationId(authorizer.context.organizationId),
    email: new Email(event.body.email),
    userName: new UserName(event.body.userName),
  }

  const context = createFunctionContext(lambdaContext)
  const keycloakUserRepository = new KeycloakUserRepository(context)
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
