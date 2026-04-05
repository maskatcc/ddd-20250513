import { APIGatewayProxyResult } from 'aws-lambda'
import mockContext from 'aws-lambda-mock-context'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserId, UserName } from '../../domains/user/user.js'
import { handler } from './index.js'
import { eventTemplate } from '../commons/testEventTemplate.js'
import { v4 as uuidv4 } from 'uuid'
import * as functions from '../../functions/userLogic/createUser.js'
import { CreateUserEvent } from './schema.js'

vi.mock('../../runtime/keycloakGateway.js', () => ({
  KeycloakGateway: vi.fn(),
  KeycloakConfig: { fromEnvironment: vi.fn().mockResolvedValue({}) },
}))

describe('lambda/createUser', () => {
  const organizationId = new OrganizationId(uuidv4())
  const email = new Email('taro@company.net')
  const userName = new UserName('Taro')
  const userId = new UserId(uuidv4())

  it('ユーザーを作成する', async () => {
    const event: CreateUserEvent = {
      ...eventTemplate,
      requestContext: {
        ...eventTemplate.requestContext,
        authorizer: {
          lambda: {
            principalId: 'accountId',
            context: {
              organizationId: organizationId.value,
            },
          },
        },
      },
      body: { email: email.value, userName: userName.value },
    }

    // arrange
    const createUserSpy = vi.spyOn(functions, 'createUser').mockReturnValue(async () => userId)

    // act
    const result: APIGatewayProxyResult = await handler(event, mockContext())

    // assert
    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual(JSON.stringify({ userId: userId.value }))
    expect(createUserSpy).toHaveBeenCalled()
  })
})
