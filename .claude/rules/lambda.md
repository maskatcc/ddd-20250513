---
description: Lambda エントリポイント層の実装規約
paths: ['src/lambda/**']
---

## ファイル構成

各Lambdaハンドラは独自ディレクトリを持ち、以下のファイルで構成する：

- `index.ts` — ハンドラ本体・ミドルウェアチェーン・DepsFactory
- `schema.ts` — Zodによるイベントスキーマ定義

共通ファイルは `lambda/commons/` に配置する：

- `httpResponse.ts` — DomainResult → HTTPレスポンス変換
- `testEventTemplate.ts` — テスト用イベントテンプレート

## 初期化

- `FunctionModuleContext` とインフラ層の Gateway はモジュールスコープで初期化する
- warm invocation での再利用を前提とした設計にする
- `depsFactory` は Composition Root として `index.ts` で定義する。依存関係の組み立てはここに集約し、他の層には持ち込まない

## ハンドラ関数

- シグネチャは `(event: XxxEvent, lambdaContext: LambdaContext) => Promise<APIGatewayProxyResult>` にする
- イベント型は `z.infer<typeof XxxEventSchema>` で導出し、`schema.ts` で定義する
- イベントのバリデーションはミドルウェアに委譲する。ハンドラ内では型安全なイベントとして扱う
- `FunctionRequestContext` はリクエストごとのObservabilityと認証情報を保持する。`requireRequestContext(lambdaContext)` で取得する
- `getAuthorizer<T>()` でオーソライザーコンテキスト（認可情報）を取得する
- イベントのプロパティから値オブジェクトを生成し、ユースケースの `input` を組み立てる
- `depsFactory(context)` でインフラ層の依存オブジェクトを生成し、ユースケース関数を呼び出す
- `logInfo` / `logWarn` / `logError` でリクエストスコープのログを記録する

## ミドルウェアチェーン

- `commonMiddleware` をベースに `.use()` で追加ミドルウェアを積む
- イベントのバリデーションは `parser({ schema: XxxEventSchema })` ミドルウェアで行う
- ハンドラ関数は `lambdaHandler` として定義し `.handler()` に渡す

## DomainResult → HTTP変換

- 成功は `httpValue(value)` でレスポンスを返す
- 失敗は `httpDomainError(domainError, statusMap)` を throw する
- `DomainErrorStatusMap<E>` でエラーコードとHTTPステータスの対応を型で網羅する
