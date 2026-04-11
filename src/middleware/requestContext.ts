import type { MiddlewareObj } from '@middy/core'
import type { APIGatewayProxyResult } from 'aws-lambda'
import { AppException, ConfigurationException } from '../domains/commons/exceptions.js'
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
      throw new ConfigurationException('Lambda authorizer is not configured for this function')
    }
    const accessToken = lambdaAuth.context?.accessToken
    if (!accessToken) {
      throw new ConfigurationException('accessToken is missing in authorizer context')
    }
    const traceId = lambdaAuth.context?.traceId
    if (!traceId) {
      throw new ConfigurationException('traceId is missing in authorizer context')
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
    const error = request.error
    if (ctx && error instanceof AppException) {
      ctx.logError(`${error.name}: ${error.message}`, error, error.context)
    }
    ctx?.logApp({ event: 'request.error', error: error ?? undefined })
  },
})
