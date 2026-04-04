import { OrganizationId } from '../../domains/organization/organization.js'
import { QueryUserRecord, PostgresqlUserQueryRepository } from '../../infrastructures/postgresql/postgresqlUserQueryRepository.js'
import { createFunctionContext, FunctionContext, PostgresqlLib } from '../../runtime/functionContext.js'
import { v4 as uuidv4 } from 'uuid'
import { queryUsers } from './queryUsers.js'

describe('queryUsers', () => {
  const context: FunctionContext = {
    ...createFunctionContext(),
    postgresql: new PostgresqlLib(),
  }
  const organizationId = new OrganizationId(uuidv4())
  const users: QueryUserRecord[] = [
    { userId: uuidv4(), userName: 'Taro', email: 'taro@campany.net' },
    { userId: uuidv4(), userName: 'Hanako', email: 'hanako@comany.net' },
    { userId: uuidv4(), userName: 'Jiro', email: 'jiro@comany.net' },
  ]

  test('対象ユーザーを問い合わせる', async () => {
    // arrange
    const querySpy = vi.spyOn(PostgresqlUserQueryRepository.prototype, 'query').mockResolvedValue(users)

    // act
    const result = await queryUsers({ organizationId }, context)

    // assert
    expect(result).toEqual(users)
    expect(querySpy).toHaveBeenCalledWith(organizationId)
  })

  test.fails('PostgreSQL接続情報がないと初期化エラー', async () => {
    // arrange
    const withoutPostgresqlContext: FunctionContext = {
      ...createFunctionContext(),
      postgresql: undefined,
    }
    vi.stubEnv('DB_ENV', 'local')

    // act
    await queryUsers({ organizationId }, withoutPostgresqlContext)
  })
})
