import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { commonMiddleware } from '../../middleware/commonMiddleware.js'
import { refreshGateway } from '../../middleware/refreshGateway.js'
import { FunctionModuleContext } from '../../runtime/functionModuleContext.js'
import { requireRequestContext } from '../../runtime/functionRequestContext.js'
import { KeycloakGateway, KeycloakConfig } from '../../runtime/keycloakGateway.js'
import { createUser, CreateUserDepsFactory } from '../../functions/userLogic/createUser.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserName } from '../../domains/user/user.js'
import { KeycloakUserRepository } from '../../infrastructures/keycloak/keycloakUserRepository.js'
import { CreateUserEvent, CreateUserEventSchema } from './schema.js'
import { httpValue } from '../commons/httpResponse.js'

// モジュールスコープで初期化（warm invocationで再利用）
const moduleContext = await FunctionModuleContext.create()
const keycloakGateway = new KeycloakGateway(await KeycloakConfig.fromEnvironment())

const depsFactory: CreateUserDepsFactory = (context) => {
  const repo = new KeycloakUserRepository(keycloakGateway, context)
  return {
    userRepository: repo,
    userOrganizationRepository: repo,
    userNotificationRepository: repo,
  }
}

async function lambdaHandler(event: CreateUserEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const context = requireRequestContext(lambdaContext)
  const { context: authorizerContext } = context.getAuthorizer<{ context: { organizationId: string } }>()
  const input = {
    organizationId: new OrganizationId(authorizerContext.organizationId),
    email: new Email(event.body.email),
    userName: new UserName(event.body.userName),
  }
  const userId = await createUser(depsFactory)(context, input)

  return httpValue({ userId: userId.value })
}

export const handler = commonMiddleware<CreateUserEvent>(moduleContext)
  .use(refreshGateway(keycloakGateway))
  .use(parser({ schema: CreateUserEventSchema }))
  .handler(lambdaHandler)
