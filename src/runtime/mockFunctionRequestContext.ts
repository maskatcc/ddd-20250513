import { IFunctionRequestContext } from '../domains/commons/IFunctionRequestContext.js'

export const mockRequestContext: IFunctionRequestContext = {
  raw: {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: { getSegment: () => undefined, setSegment: vi.fn(), putAnnotation: vi.fn(), putMetadata: vi.fn() },
    metrics: { addMetric: vi.fn(), addDimension: vi.fn() },
  },
  elapsedMs: vi.fn(() => 0),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}
