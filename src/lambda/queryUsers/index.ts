import { Context as LambdaContext, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda'
import { createFunctionContext } from '../../runtime/functionContext.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { queryUsers } from '../../functions/userLogic/queryUsers.js'

export async function handler(event: APIGatewayProxyEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  // console.log('APIGatewayProxyEvent:', JSON.stringify(event, null, 2))
  // console.log('LambdaContext:', JSON.stringify(lambdaContext, null, 2))

  const authorizerContext = JSON.parse(event.requestContext.authorizer?.context || '{}')
  const { organizationId } = authorizerContext

  const users = await queryUsers({
    organizationId: new OrganizationId(organizationId),
  }, createFunctionContext(lambdaContext))

  const result: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({ users }),
  }

  // console.log('APIGatewayProxyResult:', JSON.stringify(result, null, 2))

  return result
}
