import type { MiddlewareObj } from '@middy/core'
import type { APIGatewayProxyResult } from 'aws-lambda'
import { FunctionModuleContext } from '../runtime/functionModuleContext.js'
import { createRequestContext } from '../runtime/functionRequestContext.js'

export const requestContextMiddleware = (
  moduleContext: FunctionModuleContext,
): MiddlewareObj<unknown, APIGatewayProxyResult> => ({
  before: async (request) => {
    const event = request.event as {
      headers?: Record<string, string | undefined>
      requestContext?: {
        authorizer?: {
          lambda?: { context?: { accessToken?: string, traceId?: string, [k: string]: unknown } }
        }
      }
    }
    const lambdaAuth = event.requestContext?.authorizer?.lambda
    if (!lambdaAuth) {
      throw new Error('Lambda authorizer is not configured for this function')
    }
    const accessToken = lambdaAuth.context?.accessToken
    if (!accessToken) {
      throw new Error('accessToken is missing in authorizer context')
    }
    const traceId = lambdaAuth.context?.traceId
    if (!traceId) {
      throw new Error('traceId is missing in authorizer context')
    }

    const ctx = createRequestContext(moduleContext, request.context, {
      headers: event.headers ?? {},
      authorizer: lambdaAuth,
      accessToken,
      traceId,
    })
    request.context.requestContext = ctx
    ctx.logApp({ event: 'request.start' })
  },
  after: async (request) => {
    const ctx = request.context.requestContext
    ctx?.logApp({ event: 'request.end', statusCode: request.response?.statusCode ?? 0 })
  },
  onError: async (request) => {
    const ctx = request.context.requestContext
    ctx?.logApp({ event: 'request.error', error: request.error ?? undefined })
  },
})
