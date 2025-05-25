import middy from '@middy/core'
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { createFunctionContext } from '../../runtime/functionContext.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { queryUsers } from '../../functions/userLogic/queryUsers.js'
import { QueryUsersEvent, QueryUsersEventSchema } from './schema.js'

async function lambdaHandler(event: QueryUsersEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const authorizer = event.requestContext.authorizer.lambda
  const input = {
    organizationId: new OrganizationId(authorizer.context.organizationId),
  }

  const users = await queryUsers(input, createFunctionContext(lambdaContext))

  return {
    statusCode: 200,
    body: JSON.stringify({ users }),
  }
}

export const handler = middy()
  .use(parser({ schema: QueryUsersEventSchema }))
  .handler(lambdaHandler)
