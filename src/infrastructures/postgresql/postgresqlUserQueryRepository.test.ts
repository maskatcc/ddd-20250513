import { IFunctionRequestContext } from '../../domains/commons/IFunctionRequestContext.js'
import { PostgresqlGateway, PostgresqlConfig } from '../../runtime/postgresqlGateway.js'
import { PostgresqlUserQueryRepository } from './postgresqlUserQueryRepository.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { v4 as uuidv4 } from 'uuid'

describe('PostgresqlUserQueryRepository', () => {
  const mockContext: IFunctionRequestContext = {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: { getSegment: () => undefined, setSegment: vi.fn(), addAnnotation: vi.fn(), addMetadata: vi.fn() },
    metrics: { addMetric: vi.fn(), addDimension: vi.fn() },
  }

  test.fails('queryはまだ実装されていない', async () => {
    const config = new PostgresqlConfig('localhost', 5432, 'testdb', 'user', 'pass')
    const gateway = new PostgresqlGateway(config)
    const repository = new PostgresqlUserQueryRepository(gateway, mockContext)

    await repository.query(new OrganizationId(uuidv4()))
  })
})
