import { ILogger } from './ILogger.js'
import { ITracer } from './ITracer.js'
import { IMetrics } from './IMetrics.js'

/** モジュールスコープのオブザーバビリティインターフェース（cold startで生成、warm invocationで再利用） */
export interface IFunctionModuleContext {
  logger: ILogger
  tracer: ITracer
  metrics: IMetrics
}
