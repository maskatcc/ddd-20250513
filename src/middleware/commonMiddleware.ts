import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware'
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware'
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware'
import type { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { FunctionModuleContext } from '../runtime/functionModuleContext.js'
import { zodParseErrorHandler } from './zodParseErrorHandler.js'
import { requestContextMiddleware } from './requestContext.js'

export function commonMiddleware<TEvent>(moduleContext: FunctionModuleContext) {
  const { logger, tracer, metrics } = moduleContext

  const chain = middy<TEvent, APIGatewayProxyResult>()
    .use(httpErrorHandler({ logger: error => logger.error('Unhandled error', { error }) }))
    .use(zodParseErrorHandler())
    .use(injectLambdaContext(logger))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics))
    .use(requestContextMiddleware(moduleContext))

  return {
    use(middleware: Parameters<typeof chain.use>[0]) {
      chain.use(middleware)
      return this
    },
    handler(fn: (event: TEvent, lambdaContext: LambdaContext) => Promise<APIGatewayProxyResult>) {
      return chain.handler(fn)
    },
  }
}
