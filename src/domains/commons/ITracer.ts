/** トレースのインターフェース */
export interface ITracer {
  getSegment(): unknown
  setSegment(segment: unknown): void
  addAnnotation(key: string, value: string | number | boolean): void
  addMetadata(key: string, value: unknown, namespace?: string): void
}
