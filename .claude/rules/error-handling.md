---
description: エラーハンドリング（AppException）の実装規約
paths: ['src/**']
---

## AppException（システムエラー）

- `throw new Error()` は使わない。用途に応じた AppException サブクラスを使う
  - `ValidationException` — 値オブジェクトのバリデーション失敗（400, メッセージ公開）
  - `ConfigurationException` — 環境・設定の不備（500, メッセージ非公開）
  - `InternalException` — 内部整合性違反（500, メッセージ非公開）
- `expose: true` のエラーはメッセージがクライアントに公開される。`false` は `Internal Server Error` に置換される
- AppException は `appErrorHandler` ミドルウェアで統一的にHTTPレスポンスに変換される
- レスポンス形式: `{ code, message, traceId, payload? }`

## DomainResult（ビジネスエラー）との使い分け

- ユースケース層の期待される失敗 → `DomainResult`（戻り値で表現）
- 予期しないシステム的な失敗 → `AppException`（throw で表現）

## 補足: appErrorHandler の内部処理

通常の実装では意識不要。`appErrorHandler` はミドルウェアとして以下を統一的にHTTPレスポンスへ変換する:

- **AppException** — 上記サブクラスをそのまま処理
- **DomainErrorException** — `throwHttpError()` が DomainError をラップした例外。code・statusCode・payload を引き継ぐ
- **ParseError** — `@aws-lambda-powertools/parser` のスキーマ検証失敗（400 + PARSE_ERROR）
- **未知のError** — 上記に該当しない例外（500 + UNKNOWN_ERROR）
