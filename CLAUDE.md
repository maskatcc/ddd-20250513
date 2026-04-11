# Claude Code プロジェクト設定

## プロジェクト概要

TypeScript + AWS Lambda をベースにしたDDDアーキテクチャのサンプルコードベース。
依存性逆転・エンティティの不変性・型安全なエラーハンドリングを設計の柱としている。

## 技術スタック

- **Runtime:** Node.js 24.12 / TypeScript 5.8, AWS Lambda
- **Middleware:** middy
- **Observability:** AWS PowerTools (Logger / Metrics / Tracer)
- **Auth:** Keycloak
- **DB:** PostgreSQL (pg)
- **Validation:** Zod
- **Test:** vitest（グローバル設定済み。`describe` / `it` / `expect` の import 不要）
- **Build:** tsc / esbuild

## ディレクトリ構成

```txt
src/
  domains/         # エンティティ・リポジトリインターフェース・ドメインロジック
  functions/       # ユースケース（FunctionRequestContext経由でObservabilityを受け取る）
  infrastructures/ # リポジトリ実装・外部サービス
  lambda/          # エントリーポイント（middy + ミドルウェア）
  middleware/      # カスタムミドルウェア
  runtime/         # 設定・ゲートウェイ
  schemas/         # Zodスキーマ
```

## コーディング規約

- テストは `it()` を使う（`test()` は使わない）
- エンティティの復元は `static reconstruct()` を使う（新規作成は `new` またはcreateファクトリ）
- エラーは `DomainResult` 型で表現する

## コマンド

- `npm test` — vitest実行
- `npm run build` — tscビルド

## コーディング原則

- 変更は必要な箇所のみ。影響範囲を最小化する
