/** メトリクス記録のインターフェース */
export interface IMetrics {
  addMetric(name: string, unit: string, value: number): void
  addDimension(name: string, value: string): void
}
