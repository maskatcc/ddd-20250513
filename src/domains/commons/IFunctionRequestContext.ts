import { IFunctionModuleContext } from './IFunctionModuleContext.js'

/** リクエストスコープのオブザーバビリティインターフェース（毎リクエスト生成） */
export interface IFunctionRequestContext {
  /** モジュールスコープの生ツールへのアクセス */
  raw: IFunctionModuleContext

  /** 構造化ログ — requestId/functionName を自動付与 */
  logInfo(message: string, extra?: Record<string, unknown>): void
  logWarn(message: string, extra?: Record<string, unknown>): void
  logError(message: string, error?: Error, extra?: Record<string, unknown>): void
}

export type { IFunctionModuleContext }
