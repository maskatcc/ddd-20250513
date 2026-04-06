import { Context as LambdaContext } from 'aws-lambda'
import { IFunctionRequestContext } from '../domains/commons/IFunctionRequestContext.js'
import { FunctionModuleContext } from './functionModuleContext.js'

// aws-lambdaのContextに対するフレームワーク独自の拡張。
// requestContextはLambda標準のプロパティではなく、requestContextMiddleware（middy）が
// リクエストごとにセットアップする。ハンドラーはrequireRequestContext()経由で取得する。
declare module 'aws-lambda' {
  interface Context {
    requestContext?: FunctionRequestContext
  }
}

export class FunctionRequestContext implements IFunctionRequestContext {
  private readonly startedAt: number = Date.now()

  constructor(
    readonly raw: FunctionModuleContext,
    private readonly requestId: string,
    private readonly functionName: string,
  ) {}

  elapsedMs(): number {
    return Date.now() - this.startedAt
  }

  logInfo(message: string, extra?: Record<string, unknown>): void {
    this.raw.logger.info(message, { requestId: this.requestId, functionName: this.functionName, ...extra })
  }

  logWarn(message: string, extra?: Record<string, unknown>): void {
    this.raw.logger.warn(message, { requestId: this.requestId, functionName: this.functionName, ...extra })
  }

  logError(message: string, error?: Error, extra?: Record<string, unknown>): void {
    this.raw.logger.error(message, { requestId: this.requestId, functionName: this.functionName, error, ...extra })
  }
}

export function createRequestContext(
  moduleContext: FunctionModuleContext,
  lambdaContext: LambdaContext,
): FunctionRequestContext {
  return new FunctionRequestContext(
    moduleContext,
    lambdaContext.awsRequestId,
    lambdaContext.functionName,
  )
}

export function requireRequestContext(lambdaContext: LambdaContext): FunctionRequestContext {
  if (!lambdaContext.requestContext) {
    throw new Error('requestContextMiddleware is not registered in the middy chain')
  }
  return lambdaContext.requestContext
}
