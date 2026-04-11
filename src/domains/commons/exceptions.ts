import type { DomainError } from './DomainResult.js'

/**
 * 想定外エラーの例外型階層。
 *
 * DomainResult<T, E> が「期待されるビジネスエラー」を戻り値で表現するのに対し、
 * AppException は「想定外エラー」を throw で表現する。
 *
 * 各サブクラスは固有の code / statusCode / expose を持ち、
 * appErrorHandler ミドルウェアが統一的にエラーレスポンスへ変換する。
 */
export abstract class AppException extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number
  /** true ならエラーメッセージをクライアントに公開する */
  abstract readonly expose: boolean
  /** サーバー側ログ専用の構造化コンテキスト（クライアントには返さない） */
  readonly context: Record<string, unknown>

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message)
    this.name = this.constructor.name
    this.context = context
  }
}

/** クライアントの入力が不正（値オブジェクトのバリデーション失敗等） */
export class ValidationException extends AppException {
  readonly code = 'VALIDATION_ERROR' as const
  readonly statusCode = 400 as const
  readonly expose = true as const
}

/** 環境・構成の問題（authorizer 未設定、middleware 未登録等） */
export class ConfigurationException extends AppException {
  readonly code = 'CONFIGURATION_ERROR' as const
  readonly statusCode = 500 as const
  readonly expose = false as const
}

/** 内部整合性違反・未実装（作成直後の findById 失敗、未実装メソッド等） */
export class InternalException extends AppException {
  readonly code = 'INTERNAL_ERROR' as const
  readonly statusCode = 500 as const
  readonly expose = false as const
}

/** ドメインエラーを HTTP レスポンスに変換するための例外。appErrorHandler が処理する */
export class DomainErrorException extends AppException {
  readonly code: string
  readonly statusCode: number
  readonly expose = true as const
  readonly domainError: DomainError

  constructor(domainError: DomainError, statusCode: number) {
    super(domainError.message)
    this.code = domainError.code
    this.statusCode = statusCode
    this.domainError = domainError
  }
}
