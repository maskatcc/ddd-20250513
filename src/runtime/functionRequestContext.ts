import { Context as LambdaContext } from 'aws-lambda'
import { AppLog } from '../domains/commons/appLog.js'
import { ConfigurationException } from '../domains/commons/exceptions.js'
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

const MASKED_HEADER_KEYS = new Set(['authorization', 'referer'])

function maskHeaders(
  headers: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const masked: Record<string, string | undefined> = {}
  for (const [k, v] of Object.entries(headers)) {
    masked[k] = MASKED_HEADER_KEYS.has(k.toLowerCase()) ? '***' : v
  }
  return masked
}

export class FunctionRequestContext implements IFunctionRequestContext {
  private readonly startedAt: number = Date.now()

  constructor(
    readonly raw: FunctionModuleContext,
    private readonly requestId: string,
    private readonly functionName: string,
    readonly headers: Record<string, string | undefined>,
    private readonly authorizer: unknown,
    readonly accessToken: string,
    readonly traceId: string,
  ) {}

  elapsedMs(): number {
    return Date.now() - this.startedAt
  }

  getAuthorizer<T>(): T {
    return this.authorizer as T
  }

  logApp(payload: AppLog): void {
    this.raw.appLogger.info('appLog', {
      functionName: this.functionName,
      durationMs: this.elapsedMs(),
      requestId: this.requestId,
      traceId: this.traceId,
      headers: maskHeaders(this.headers),
      ...payload,
    })
  }

  logInfo(message: string, extra?: Record<string, unknown>): void {
    this.raw.logger.info(message, { requestId: this.requestId, traceId: this.traceId, functionName: this.functionName, ...extra })
  }

  logWarn(message: string, extra?: Record<string, unknown>): void {
    this.raw.logger.warn(message, { requestId: this.requestId, traceId: this.traceId, functionName: this.functionName, ...extra })
  }

  logError(message: string, error?: Error, extra?: Record<string, unknown>): void {
    this.raw.logger.error(message, { requestId: this.requestId, traceId: this.traceId, functionName: this.functionName, error, ...extra })
  }
}

export type CreateRequestContextOptions = {
  headers: Record<string, string | undefined>
  authorizer: unknown
  accessToken: string
  traceId: string
}

export function createRequestContext(
  moduleContext: FunctionModuleContext,
  lambdaContext: LambdaContext,
  options: CreateRequestContextOptions,
): FunctionRequestContext {
  return new FunctionRequestContext(
    moduleContext,
    lambdaContext.awsRequestId,
    lambdaContext.functionName,
    options.headers,
    options.authorizer,
    options.accessToken,
    options.traceId,
  )
}

export function requireRequestContext(lambdaContext: LambdaContext): FunctionRequestContext {
  if (!lambdaContext.requestContext) {
    throw new ConfigurationException('requestContextMiddleware is not registered in the middy chain')
  }
  return lambdaContext.requestContext
}
