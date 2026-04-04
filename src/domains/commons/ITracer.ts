/** トレースのインターフェース */
export interface ITracer {
  getSegment(): unknown
  setSegment(segment: unknown): void
  putAnnotation(key: string, value: string | number | boolean): void
  putMetadata(key: string, value: unknown, namespace?: string): void
}
