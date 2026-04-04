import { ILogger } from './ILogger.js'
import { ITracer } from './ITracer.js'
import { IMetrics } from './IMetrics.js'

/** リクエストスコープのオブザーバビリティインターフェース */
export interface IFunctionRequestContext {
  logger: ILogger
  tracer: ITracer
  metrics: IMetrics
}

export type { ILogger, ITracer, IMetrics }
