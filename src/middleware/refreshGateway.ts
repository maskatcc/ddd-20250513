import type { MiddlewareObj } from '@middy/core'

interface Refreshable {
  refresh(): Promise<void>
}

export const refreshGateway = (gateway: Refreshable): MiddlewareObj => ({
  before: async () => {
    await gateway.refresh()
  },
})
