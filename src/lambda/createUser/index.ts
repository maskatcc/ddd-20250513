import { Context as LambdaContext, APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda'
import { createFunctionContext } from '../../runtime/functionContext.js'
import { createUser } from '../../functions/userLogic/createUser.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserName } from '../../domains/user/user.js'

export async function handler(event: APIGatewayProxyEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  // console.log('APIGatewayProxyEvent:', JSON.stringify(event, null, 2))
  // console.log('LambdaContext:', JSON.stringify(lambdaContext, null, 2))

  const authorizerContext = JSON.parse(event.requestContext.authorizer?.context || '{}')
  const requestPayload = JSON.parse(event.body || '{}')
  const { organizationId } = authorizerContext
  const { email, userName } = requestPayload

  const userId = await createUser({
    organizationId: new OrganizationId(organizationId),
    email: new Email(email),
    userName: new UserName(userName),
  }, createFunctionContext(lambdaContext))

  const result: APIGatewayProxyResult = {
    statusCode: 200,
    body: JSON.stringify({ userId: userId.value }),
  }

  // console.log('APIGatewayProxyResult:', JSON.stringify(result, null, 2))

  return result
}
