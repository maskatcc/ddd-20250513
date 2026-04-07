/**
 * requestContextMiddleware が出力する構造化アプリケーションログのペイロード型。
 * イベント固有のフィールドのみを表現する。requestId / functionName / headers / durationMs は
 * FunctionRequestContext.logApp 内で自動付与される。
 */
export type AppLog =
  | { event: 'request.start' }
  | { event: 'request.end', statusCode: number }
  | { event: 'request.error', error?: Error }
