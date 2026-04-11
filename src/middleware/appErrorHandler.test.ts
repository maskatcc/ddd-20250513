import { appErrorHandler } from './appErrorHandler.js'
import { ValidationException, ConfigurationException, InternalException, DomainErrorException } from '../domains/commons/exceptions.js'

const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}

function createRequest(error: Error, traceId?: string) {
  return {
    event: {},
    context: {
      requestContext: traceId ? { traceId } : undefined,
    },
    response: undefined as unknown,
    error,
    internal: {},
  }
}

describe('appErrorHandler', () => {
  const handler = appErrorHandler(mockLogger as never)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ValidationException', () => {
    it('400 + code=VALIDATION_ERROR + メッセージ公開 + traceId', async () => {
      const request = createRequest(new ValidationException('bad email'), 'trace-123')

      await handler.onError!(request as never)

      const response = request.response as { statusCode: number, body: string }
      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.code).toBe('VALIDATION_ERROR')
      expect(body.message).toBe('bad email')
      expect(body.traceId).toBe('trace-123')
    })
  })

  describe('ConfigurationException', () => {
    it('500 + code=CONFIGURATION_ERROR + メッセージ非公開', async () => {
      const request = createRequest(new ConfigurationException('authorizer missing'), 'trace-456')

      await handler.onError!(request as never)

      const response = request.response as { statusCode: number, body: string }
      expect(response.statusCode).toBe(500)

      const body = JSON.parse(response.body)
      expect(body.code).toBe('CONFIGURATION_ERROR')
      expect(body.message).toBe('Internal Server Error')
      expect(body.traceId).toBe('trace-456')
    })
  })

  describe('InternalException', () => {
    it('500 + code=INTERNAL_ERROR + メッセージ非公開 + context をログに含む', async () => {
      const request = createRequest(new InternalException('not found', { userId: '123' }), 'trace-789')

      await handler.onError!(request as never)

      const response = request.response as { statusCode: number, body: string }
      expect(response.statusCode).toBe(500)

      const body = JSON.parse(response.body)
      expect(body.code).toBe('INTERNAL_ERROR')
      expect(body.message).toBe('Internal Server Error')
      expect(body.traceId).toBe('trace-789')

      expect(mockLogger.error).toHaveBeenCalledWith(
        'InternalException: not found',
        expect.objectContaining({ traceId: 'trace-789', userId: '123' }),
      )
    })
  })

  describe('ParseError', () => {
    it('400 + code=PARSE_ERROR + メッセージ公開', async () => {
      const error = new Error('Invalid body')
      error.name = 'ParseError'
      const request = createRequest(error, 'trace-parse')

      await handler.onError!(request as never)

      const response = request.response as { statusCode: number, body: string }
      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.code).toBe('PARSE_ERROR')
      expect(body.message).toBe('Invalid body')
      expect(body.traceId).toBe('trace-parse')
    })
  })

  describe('未知のエラー', () => {
    it('500 + code=UNKNOWN_ERROR + メッセージ非公開', async () => {
      const request = createRequest(new Error('something broke'), 'trace-unknown')

      await handler.onError!(request as never)

      const response = request.response as { statusCode: number, body: string }
      expect(response.statusCode).toBe(500)

      const body = JSON.parse(response.body)
      expect(body.code).toBe('UNKNOWN_ERROR')
      expect(body.message).toBe('Internal Server Error')
      expect(body.traceId).toBe('trace-unknown')
    })
  })

  describe('DomainErrorException', () => {
    it('ドメインエラーの code / message / statusCode でレスポンスを生成する', async () => {
      const domainError = { code: 'USER_NOT_FOUND', message: 'ユーザーが見つかりません' }
      const request = createRequest(new DomainErrorException(domainError, 404), 'trace-domain')

      await handler.onError!(request as never)

      const response = request.response as { statusCode: number, body: string }
      expect(response.statusCode).toBe(404)

      const body = JSON.parse(response.body)
      expect(body.code).toBe('USER_NOT_FOUND')
      expect(body.message).toBe('ユーザーが見つかりません')
      expect(body.traceId).toBe('trace-domain')
      expect(body.payload).toBeUndefined()
    })

    it('payload 付きドメインエラーはレスポンスに payload を含める', async () => {
      const domainError = { code: 'EMAIL_TAKEN', message: '登録済み', payload: { email: 'a@b.com' } }
      const request = createRequest(new DomainErrorException(domainError, 409), 'trace-payload')

      await handler.onError!(request as never)

      const response = request.response as { statusCode: number, body: string }
      expect(response.statusCode).toBe(409)

      const body = JSON.parse(response.body)
      expect(body.code).toBe('EMAIL_TAKEN')
      expect(body.message).toBe('登録済み')
      expect(body.traceId).toBe('trace-payload')
      expect(body.payload).toEqual({ email: 'a@b.com' })
    })
  })

  describe('traceId 未取得時', () => {
    it('traceId が unknown になる', async () => {
      const request = createRequest(new ValidationException('bad input'))
      // requestContext が undefined のケース
      request.context.requestContext = undefined

      await handler.onError!(request as never)

      const body = JSON.parse((request.response as { body: string }).body)
      expect(body.traceId).toBe('unknown')
    })
  })
})
