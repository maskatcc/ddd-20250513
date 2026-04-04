import createHttpError from 'http-errors'
import type { APIGatewayProxyResult } from 'aws-lambda'
import type { DomainError } from '../../domains/commons/DomainResult.js'

// ドメインエラー → HTTPエラー（@middy/http-error-handler がキャッチしてレスポンスに変換）
// error.message にJSONを設定することで { code, message } 形式のボディになる
export function httpError(statusCode: number, domainError: DomainError) {
  const error = createHttpError(statusCode)
  error.message = JSON.stringify({
    code: domainError.code,
    message: domainError.message,
  })
  return error
}

// ドメイン値 → HTTPレスポンス（成功）
export function httpValue<T>(value: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(value),
  }
}
