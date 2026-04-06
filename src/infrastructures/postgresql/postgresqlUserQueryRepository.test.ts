import { mockRequestContext } from '../../runtime/mockFunctionRequestContext.js'
import { PostgresqlGateway, PostgresqlConfig } from '../../runtime/postgresqlGateway.js'
import { PostgresqlUserQueryRepository } from './postgresqlUserQueryRepository.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { v4 as uuidv4 } from 'uuid'

describe('PostgresqlUserQueryRepository', () => {

  it.fails('queryはまだ実装されていない', async () => {
    const config = new PostgresqlConfig('localhost', 5432, 'testdb', 'user', 'pass')
    const gateway = new PostgresqlGateway(config)
    const repository = new PostgresqlUserQueryRepository(gateway, mockRequestContext)

    await repository.query(new OrganizationId(uuidv4()))
  })
})
