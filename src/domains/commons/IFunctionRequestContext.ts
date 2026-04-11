import { AppLog } from './appLog.js'
import { IFunctionModuleContext } from './IFunctionModuleContext.js'

/** リクエストスコープのオブザーバビリティインターフェース（毎リクエスト生成） */
export interface IFunctionRequestContext {
  /** モジュールスコープの生ツールへのアクセス */
  raw: IFunctionModuleContext

  /** リクエスト開始からの経過時間（ミリ秒） */
  elapsedMs(): number

  /** 認証主体のアクセストークン（Authorizer から伝播） */
  readonly accessToken: string

  /** リクエスト追跡ID（クライアント送信 or Authorizer 生成、Authorizer context から伝播） */
  readonly traceId: string

  /** 構造化アプリケーションログを出力 — requestId/functionName/headers/durationMs を自動付与 */
  logApp(payload: AppLog): void

  /** 任意の構造化ログ — requestId/functionName を自動付与 */
  logInfo(message: string, extra?: Record<string, unknown>): void
  logWarn(message: string, extra?: Record<string, unknown>): void
  logError(message: string, error?: Error, extra?: Record<string, unknown>): void
}

export type { IFunctionModuleContext }
