import { createFunctionContext, FunctionContext } from '../../runtime/functionContext.js'
import { PostgresqlUserQueryRepository } from './postgresqlUserQueryRepository.js'

describe('PostgresqlUserQueryRepository', () => {
  test.fails('PostgreSQL接続情報がないと初期化エラー', () => {
    const context: FunctionContext = {
      ...createFunctionContext(),
      postgresql: undefined,
    }
    vi.stubEnv('DB_ENV', 'local')

    new PostgresqlUserQueryRepository(context)
  })
})
