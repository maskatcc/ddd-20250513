import { z } from 'zod'
import { APIGatewayProxyEventV2Schema, APIGatewayRequestContextV2Schema, APIGatewayRequestAuthorizerV2Schema } from '@aws-lambda-powertools/parser/schemas'
import { LambdaAuthorizerSchema } from '../../schemas/lambdaAuthorizerSchema.js'

export const QueryUsersEventSchema = APIGatewayProxyEventV2Schema.extend({
  requestContext: APIGatewayRequestContextV2Schema.extend({
    authorizer: APIGatewayRequestAuthorizerV2Schema.extend({
      lambda: LambdaAuthorizerSchema,
    }),
  }),
})

export type QueryUsersEvent = z.infer<typeof QueryUsersEventSchema>
