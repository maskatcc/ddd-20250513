import { z } from 'zod'
import { APIGatewayProxyEventV2Schema, APIGatewayRequestAuthorizerV2Schema, APIGatewayRequestContextV2Schema } from '@aws-lambda-powertools/parser/schemas'
import { LambdaAuthorizerSchema } from '../../schemas/lambdaAuthorizerSchema.js'

const CreateUserInputSchema = z.object({
  email: z.string(),
  userName: z.string(),
})

export const CreateUserEventSchema = APIGatewayProxyEventV2Schema.extend({
  requestContext: APIGatewayRequestContextV2Schema.extend({
    authorizer: APIGatewayRequestAuthorizerV2Schema.extend({
      lambda: LambdaAuthorizerSchema,
    }),
  }),
  body: CreateUserInputSchema,
})

export type CreateUserEvent = z.infer<typeof CreateUserEventSchema>
