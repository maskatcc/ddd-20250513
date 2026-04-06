import type { MiddlewareObj } from '@middy/core'
import type { APIGatewayProxyResult } from 'aws-lambda'
import { FunctionModuleContext } from '../runtime/functionModuleContext.js'
import { createRequestContext } from '../runtime/functionRequestContext.js'

export const requestContextMiddleware = (
  moduleContext: FunctionModuleContext,
): MiddlewareObj<unknown, APIGatewayProxyResult> => ({
  before: async (request) => {
    const ctx = createRequestContext(moduleContext, request.context)
    request.context.requestContext = ctx
    ctx.logInfo('request.start')
  },
  after: async (request) => {
    const ctx = request.context.requestContext
    ctx?.logInfo('request.end', {
      statusCode: request.response?.statusCode,
      durationMs: ctx.elapsedMs(),
    })
  },
  onError: async (request) => {
    const ctx = request.context.requestContext
    ctx?.logError('request.error', request.error ?? undefined, {
      durationMs: ctx.elapsedMs(),
    })
  },
})
