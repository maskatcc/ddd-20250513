import { z } from 'zod'
import { APIGatewayProxyEventV2Schema } from '@aws-lambda-powertools/parser/schemas'

type APIGatewayProxyEventV2 = z.infer<typeof APIGatewayProxyEventV2Schema>

// Create AWS Lambda proxy integrations for HTTP APIs in API Gateway - Amazon API Gateway
// https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
export const eventTemplate: APIGatewayProxyEventV2 = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/my/path',
  rawQueryString: 'parameter1=value1&parameter1=value2&parameter2=value',
  cookies: undefined,
  headers: {
    'X-AMZ-Date': '20231001T000000Z',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  queryStringParameters: {
    parameter1: 'value1,value2',
    parameter2: 'value',
  },
  requestContext: {
    time: '2023-10-01T00:00:00Z',
    accountId: '123456789012',
    apiId: '',
    stage: 'dev',
    requestId: '',
    domainName: '',
    domainPrefix: '',
    routeKey: '$default',
    http: {
      path: '/request',
      sourceIp: '1.2.3.4',
      userAgent: '',
      protocol: 'HTTP/1.1',
      method: 'GET',
    },
    timeEpoch: 1696118400000,
    authorizer: {
      lambda: {
        principalId: 'taro',
        context: {
          organizationId: 'xxx-xxxx-xxxx-xxx',
          accessToken: 'mock-access-token',
          traceId: 'mock-trace-id',
        },
      },
    },
    authentication: undefined,
  },
  body: undefined,
  pathParameters: undefined,
  isBase64Encoded: false,
  stageVariables: undefined,
}
