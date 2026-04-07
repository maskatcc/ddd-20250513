import { Logger } from '@aws-lambda-powertools/logger'
import { Tracer } from '@aws-lambda-powertools/tracer'
import { Metrics } from '@aws-lambda-powertools/metrics'
import { IFunctionModuleContext } from '../domains/commons/IFunctionModuleContext.js'
import { MinimalLogFormatter } from './minimalLogFormatter.js'

type FunctionModuleContextOptions = {
  serviceName?: string
}

export class FunctionModuleContext implements IFunctionModuleContext {
  constructor(
    readonly logger: Logger,
    readonly appLogger: Logger,
    readonly tracer: Tracer,
    readonly metrics: Metrics,
  ) {}

  static async create(options?: FunctionModuleContextOptions): Promise<FunctionModuleContext> {
    // 将来: Secrets Manager等からの設定読み込みをここに追加
    const serviceOpts = options?.serviceName ? { serviceName: options.serviceName } : undefined
    return new FunctionModuleContext(
      new Logger(serviceOpts),
      new Logger({ ...serviceOpts, logFormatter: new MinimalLogFormatter() }),
      new Tracer(serviceOpts),
      new Metrics(serviceOpts),
    )
  }
}
