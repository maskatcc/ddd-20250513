import { z } from 'zod'

export const LambdaAuthorizerSchema = z.object({
  principalId: z.string(),
  context: z.object({
    organizationId: z.string(),
    accessToken: z.string(),
    traceId: z.string(),
  }),
})

export type LambdaAuthorizer = z.infer<typeof LambdaAuthorizerSchema>
