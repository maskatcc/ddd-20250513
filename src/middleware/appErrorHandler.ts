import type { MiddlewareObj } from '@middy/core'
import type { APIGatewayProxyResult } from 'aws-lambda'
import type { Logger } from '@aws-lambda-powertools/logger'
import { AppException, DomainErrorException } from '../domains/commons/exceptions.js'

/**
 * 統合エラーハンドラ。httpErrorHandler + zodParseErrorHandler を置き換える。
 *
 * - AppException: code / statusCode / expose に基づいてレスポンスを生成
 * - ParseError（@aws-lambda-powertools/parser）: 400 + PARSE_ERROR
 * - その他: 500 + UNKNOWN_ERROR
 *
 * 全レスポンスに traceId を含め、{ code, message, traceId } で統一する。
 */
export const appErrorHandler = (logger: Logger): MiddlewareObj<unknown, APIGatewayProxyResult> => ({
  onError: async (request) => {
    const error = request.error
    if (!error) return

    const traceId = request.context.requestContext?.traceId ?? 'unknown'
    let statusCode: number
    const body: Record<string, unknown> = { traceId }

    // @aws-lambda-powertools/parser が Zod バリデーション失敗時に throw する ParseError の救済。
    // ParseError は http-errors ではない通常の Error なので、素通しすると 500 になる。
    // parser ミドルウェアがイベントスキーマの検証に失敗すると name='ParseError' の例外を投げるため、
    // name で判別して 400 に変換する。
    if (error.name === 'ParseError') {
      statusCode = 400
      body.code = 'PARSE_ERROR'
      body.message = error.message
      logger.error('ParseError', { error, traceId })
    }
    else if (error instanceof DomainErrorException) {
      statusCode = error.statusCode
      body.code = error.code
      body.message = error.message
      if ('payload' in error.domainError) {
        body.payload = (error.domainError as { payload: unknown }).payload
      }
      logger.error(`${error.name}: ${error.message}`, { error, traceId })
    }
    else if (error instanceof AppException) {
      statusCode = error.statusCode
      body.code = error.code
      body.message = error.expose ? error.message : 'Internal Server Error'
      logger.error(`${error.name}: ${error.message}`, { error, traceId, ...error.context })
    }
    else {
      statusCode = 500
      body.code = 'UNKNOWN_ERROR'
      body.message = 'Internal Server Error'
      logger.error('Unhandled error', { error, traceId })
    }

    request.response = {
      statusCode,
      body: JSON.stringify(body),
    }
  },
})
