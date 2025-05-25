import middy from '@middy/core'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { createFunctionContext } from '../../runtime/functionContext.js'
import { createUser } from '../../functions/userLogic/createUser.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserName } from '../../domains/user/user.js'
import { CreateUserEvent, CreateUserEventSchema } from './schema.js'

async function lambdaHandler(event: CreateUserEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const authorizer = event.requestContext.authorizer.lambda
  const input = {
    organizationId: new OrganizationId(authorizer.context.organizationId),
    email: new Email(event.body.email),
    userName: new UserName(event.body.userName),
  }

  const userId = await createUser(input, createFunctionContext(lambdaContext))

  return {
    statusCode: 200,
    body: JSON.stringify({ userId: userId.value }),
  }
}

export const handler = middy()
  .use(parser({ schema: CreateUserEventSchema }))
  .handler(lambdaHandler)
