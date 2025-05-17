import { OrganizationId } from '../../domains/organization/organization.js'
import { QueryUserRecord, UserQueryRepository } from '../../infrastructures/postgresql/userQueryRepository.js'
import { FunctionContext, KeycloakLib, PostgresqlLib } from '../../runtime/functionContext.js'
import { v4 as uuidv4 } from 'uuid'
import { queryUser } from './queryUsers.js'

describe('queryUser', () => {
  const context: FunctionContext = {
    Keycloak: new KeycloakLib(),
    Postgresql: new PostgresqlLib(),
  }
  const organizationId = new OrganizationId(uuidv4())
  const users: QueryUserRecord[] = [
    { userId: uuidv4(), userName: 'Taro', email: 'taro@campany.net' },
    { userId: uuidv4(), userName: 'Hanako', email: 'hanako@comany.net' },
    { userId: uuidv4(), userName: 'Jiro', email: 'jiro@comany.net' },
  ]

  test('対象ユーザーを問い合わせる', async () => {
    // arrange
    const querySpy = vi.spyOn(UserQueryRepository.prototype, 'query').mockResolvedValue(users)

    // act
    const result = await queryUser({ organizationId }, context)

    // assert
    expect(result).toEqual(users)
    expect(querySpy).toHaveBeenCalledWith(organizationId)
  })

  test.fails('PostgreSQL接続情報がないと初期化エラー', async () => {
    // arrange
    const withoutPostgresqlContext: FunctionContext = {
      ...context,
      Postgresql: undefined,
    }
    vi.stubEnv('DB_ENV', 'local')

    // act
    await queryUser({ organizationId }, withoutPostgresqlContext)
  })
})
