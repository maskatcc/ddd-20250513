import createHttpError from 'http-errors'
import type { APIGatewayProxyResult } from 'aws-lambda'
import type { DomainError } from '../../domains/commons/DomainResult.js'

// E のすべての code を網羅していることを型で強制
export type DomainErrorStatusMap<E extends DomainError> = {
  readonly [K in E['code']]: number
}

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

// ドメインエラー → HTTPエラー（statusMap で code→ステータスの網羅性を型強制）
// body は { code, message, payload? } 構造
export function httpDomainError<E extends DomainError>(
  domainError: E,
  statusMap: DomainErrorStatusMap<E>,
) {
  const error = createHttpError(statusMap[domainError.code as E['code']])
  const body: Record<string, unknown> = { code: domainError.code, message: domainError.message }
  if ('payload' in domainError) body.payload = domainError.payload
  error.message = JSON.stringify(body)
  return error
}

// ドメイン値 → HTTPレスポンス（成功）
export function httpValue<T>(value: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(value),
  }
}
