import { z } from 'zod'

export const LambdaAuthorizerSchema = z.object({
  principalId: z.string(),
  context: z.object({
    organizationId: z.string(),
  }),
})

export type LambdaAuthorizer = z.infer<typeof LambdaAuthorizerSchema>
