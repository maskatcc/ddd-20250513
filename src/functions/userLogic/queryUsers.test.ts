import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserQueryService, UserQueryResult } from '../../domains/user/repositories/index.js'
import { mockRequestContext } from '../../runtime/mockFunctionRequestContext.js'
import { v4 as uuidv4 } from 'uuid'
import { queryUsers, QueryUsersDeps } from './queryUsers.js'

describe('queryUsers', () => {
  const organizationId = new OrganizationId(uuidv4())
  const users: UserQueryResult[] = [
    { userId: uuidv4(), userName: 'Taro', email: 'taro@campany.net' },
    { userId: uuidv4(), userName: 'Hanako', email: 'hanako@comany.net' },
    { userId: uuidv4(), userName: 'Jiro', email: 'jiro@comany.net' },
  ]

  it('対象ユーザーを問い合わせる', async () => {
    // arrange
    const mockUserQueryService: IUserQueryService = {
      query: vi.fn().mockResolvedValue(users),
    }
    const deps: QueryUsersDeps = {
      userQueryService: mockUserQueryService,
    }

    // act
    const result = await queryUsers(() => deps)(mockRequestContext, { organizationId })

    // assert
    expect(result).toEqual({ successful: true, domainValue: users })
    expect(mockUserQueryService.query).toHaveBeenCalledWith(organizationId)
  })
})
