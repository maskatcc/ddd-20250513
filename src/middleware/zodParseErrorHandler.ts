import createHttpError from 'http-errors'
import type { MiddlewareObj } from '@middy/core'

// @aws-lambda-powertools/parser の ParseError（Zodバリデーション失敗）を 400 に変換する
// @middy/http-error-handler の前段で変換することで適切なステータスコードを返す
export const zodParseErrorHandler = (): MiddlewareObj => ({
  onError: (request) => {
    if (request.error?.name === 'ParseError') {
      const error = createHttpError(400, request.error.message)
      error.expose = true
      request.error = error
    }
  },
})
