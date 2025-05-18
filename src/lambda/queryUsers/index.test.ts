import { APIGatewayProxyResult, APIGatewayProxyEvent } from 'aws-lambda'
import mockContext from 'aws-lambda-mock-context'
import { OrganizationId } from '../../domains/organization/organization.js'
import { handler } from './index.js'
import { eventTemplate } from '../commons/testEventTemplate.js'
import { v4 as uuidv4 } from 'uuid'
import * as functions from '../../functions/userLogic/queryUsers.js'
import { QueryUserRecord } from '../../infrastructures/postgresql/userQueryRepository.js'

describe('lambda/queryUsers', () => {
  const organizationId = new OrganizationId(uuidv4())
  const users: QueryUserRecord[] = [
    { userId: uuidv4(), userName: 'Taro', email: 'taro@campany.net' },
    { userId: uuidv4(), userName: 'Hanako', email: 'hanako@comany.net' },
    { userId: uuidv4(), userName: 'Jiro', email: 'jiro@comany.net' },
  ]

  test('対象ユーザーを問い合わせる', async () => {
    const event: APIGatewayProxyEvent = {
      ...eventTemplate,
      requestContext: {
        ...eventTemplate.requestContext,
        authorizer: {
          context: JSON.stringify({ organizationId: organizationId.value }),
        },
      },
    }

    // arrange
    const queryUsersSpy = vi.spyOn(functions, 'queryUsers').mockResolvedValue(users)

    // act
    const result: APIGatewayProxyResult = await handler(event, mockContext())

    // assert
    expect(result.statusCode).toBe(200)
    expect(result.body).toEqual(JSON.stringify({ users }))
    expect(queryUsersSpy).toHaveBeenCalled()
  })
})
