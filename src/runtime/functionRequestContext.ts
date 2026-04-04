import { Context as LambdaContext } from 'aws-lambda'
import { IFunctionRequestContext, ILogger, ITracer, IMetrics } from '../domains/commons/IFunctionRequestContext.js'

type FunctionRequestContext = IFunctionRequestContext & {
  lambdaContext: LambdaContext
}

function createFunctionRequestContext(
  lambdaContext: LambdaContext,
  logger: ILogger,
  tracer: ITracer,
  metrics: IMetrics,
): FunctionRequestContext {
  return {
    lambdaContext,
    logger,
    tracer,
    metrics,
  }
}

export {
  type FunctionRequestContext,
  createFunctionRequestContext,
}
