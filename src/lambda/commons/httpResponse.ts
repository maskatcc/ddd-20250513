import type { APIGatewayProxyResult } from 'aws-lambda'
import type { DomainError } from '../../domains/commons/DomainResult.js'
import { DomainErrorException } from '../../domains/commons/exceptions.js'

// E のすべての code を網羅していることを型で強制
export type DomainErrorStatusMap<E extends DomainError> = {
  readonly [K in E['code']]: number
}

// ドメインエラー → DomainErrorException を throw（appErrorHandler が traceId を付与してレスポンス生成）
// statusMap で code→ステータスの網羅性を型強制
export function throwHttpError<E extends DomainError>(
  domainError: E,
  statusMap: DomainErrorStatusMap<E>,
): never {
  throw new DomainErrorException(domainError, statusMap[domainError.code as E['code']])
}

// ドメイン値 → HTTPレスポンス（成功）
export function httpValue<T>(value: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    body: JSON.stringify(value),
  }
}
