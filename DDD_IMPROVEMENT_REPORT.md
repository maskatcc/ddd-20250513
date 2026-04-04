# DDD改善プロジェクト レポート

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-04-04 | Priority 1: リポジトリインターフェース導入 + パラメータインジェクション |
| 2026-04-04 | Priority 2: FunctionContext分離 + Config/Gateway分離 |
| 2026-04-04 | Priority 3: エンティティの充実（readonly / equals / reconstruct） |
| 2026-04-04 | Priority 4: エラーハンドリングの型安全化 + グローバル例外ハンドラ |

## 背景

本プロジェクトのコードベースは、AWS Lambda上で稼働する4層アーキテクチャ（domains / functions / infrastructures / lambda）で構成されている。DDDの原則に基づいた設計ではあったが、以下の技術的負債が存在していた。

| 課題 | 影響 |
|------|------|
| リポジトリに抽象（インターフェース）がなく、アプリケーション層が具象クラスを直接import | 依存性逆転の原則に違反。テストが `vi.spyOn(Repository.prototype, ...)` に依存し脆い |
| `FunctionContext` がオブザーバビリティとインフラ接続の両方の責務を持つ | 単一責任の原則に違反。具象リポジトリが不要な情報に依存 |
| エンティティのフィールドが `public` で外部から変更可能 | 不変性が型レベルで保証されない。等価性判定やDB復元の意図が不明確 |
| エラーハンドリングが汎用 `throw new Error(...)` のみ | Lambda ハンドラにエラーレスポンスのマッピングがなく、全エラーが500。カスタムエラー型がゼロ |

これらを4段階の優先度に分けて段階的に改善した。各ステップ後にテスト全パス・型チェック通過を確認している。

---

## Priority 1: リポジトリインターフェース導入 + パラメータインジェクション

### 目的

依存性逆転の原則を適用し、アプリケーション層（functions）からインフラ層（infrastructures）への直接依存を解消する。あわせて、テストをプロトタイプモックからインターフェースモックに移行する。

### 設計方針

- **インターフェースの配置**: ドメイン層（`src/domains/user/repositories/`）に定義。「ドメインが必要とする永続化の契約」という位置づけ
- **インターフェース分割（ISP）**: ユースケース単位で分割。`IUserRepository`（CRUD）、`IUserOrganizationRepository`（組織操作）、`IUserNotificationRepository`（通知）、`IUserQueryService`（参照）の4つ
- **クラス統合**: 同一インフラ技術（Keycloak）に対しては1クラスで複数インターフェースを `implements`。接続の共有と責務の明確化を両立
- **DIの方式**: Lambda（サーバーレス）にDIコンテナは過剰。関数引数で依存を受け取るパラメータインジェクションを採用。Lambda HandlerがComposition Rootとして具象クラスを組み立てる

### 主な変更

```
src/domains/user/repositories/
├── IUserRepository.ts            ← CRUD操作
├── IUserOrganizationRepository.ts ← 組織参加
├── IUserNotificationRepository.ts ← 招待・メール確認
├── IUserQueryService.ts           ← 参照（CQRSの読み取り側）
└── index.ts                       ← barrel export
```

- `createUser(args, deps)` のように `deps` で依存を受け取る形式に変更
- テストは `vi.fn()` でインターフェースを直接モック化（`vi.spyOn(*.prototype)` を廃止）
- 旧リポジトリファイル5つを削除

### 効果

- アプリケーション層からインフラ層へのimportが完全に消滅
- テストが実装の内部構造に依存しなくなった
- リポジトリの実装を差し替えても、アプリケーション層のコード変更が不要

---

## Priority 2: FunctionContext分離 + Config/Gateway分離

### 目的

`FunctionContext` が持っていた「オブザーバビリティ」と「インフラ接続」の2つの責務を分離する。あわせて、`KeycloakLib` / `PostgresqlLib` が持っていた「設定保持」と「クライアント管理」の責務も分離する。

### 設計方針

- **FunctionRequestContext**: オブザーバビリティ専用（Logger / Tracer / Metrics）にリネーム・限定
- **ドメイン層にインターフェース定義**: `ILogger`, `ITracer`, `IMetrics`, `IFunctionRequestContext` を `src/domains/commons/` に配置。依存性逆転パターンをリポジトリと同様に適用
- **Config/Gateway分離**: 接続設定の保持（Config）とクライアント管理（Gateway）を明示的に分離

| 変更前 | 変更後 | 責務 |
|--------|--------|------|
| `KeycloakLib` | `KeycloakConfig` | 接続設定の保持・解決（イミュータブル、`static fromEnvironment()`） |
| | `KeycloakGateway` | クライアント生成・保持、トークンリフレッシュ |
| `PostgresqlLib` | `PostgresqlConfig` | 同上 |
| | `PostgresqlGateway` | クライアント生成・保持、接続プール管理 |

- **Middyとの統合**: PowerToolsのmiddyミドルウェア（`injectLambdaContext`, `captureLambdaHandler`, `logMetrics`）でモジュールスコープとリクエストスコープの差を吸収

### 主な変更

```
src/domains/commons/
├── IFunctionRequestContext.ts  ← オブザーバビリティ用コンテキスト（インターフェース）
├── ILogger.ts
├── ITracer.ts
└── IMetrics.ts

src/runtime/
├── functionRequestContext.ts   ← 具象実装（PowerTools）
├── keycloakConfig.ts           ← 接続設定
├── keycloakGateway.ts          ← クライアント管理
├── postgresqlConfig.ts
└── postgresqlGateway.ts
```

### 効果

- `FunctionRequestContext` の責務がオブザーバビリティに限定され、明確になった
- Config の `static fromEnvironment()` で設定ソースの差し替え（テスト/本番）が容易に
- 具象リポジトリがGatewayを直接受け取るため、不要な依存がなくなった

---

## Priority 3: エンティティの充実（readonly / equals / reconstruct）

### 目的

DDDにおけるエンティティの原則（IDによる同一性判定、不変性、新規作成と復元の分離）を型レベルで保証する。

### 設計方針

- **readonly化**: `public` → `public readonly`。既にミューテーションはなかったが、型レベルで不変性を保証
- **equals**: エンティティの等価性はIDのみで判定（DDDの原則）。Value Objectの `equals`（値で比較）とは異なる
- **reconstruct**: `static reconstruct()` で永続化からの復元経路を明示的に分離。将来のバリデーション省略やデータ補正の拡張ポイントとする

### 使い分けルール

| 操作 | 使用するAPI |
|------|------------|
| 新規作成 | `new User(id, name, email)` |
| 永続化からの復元（infrastructure層） | `User.reconstruct(id, name, email)` |
| 同一エンティティの判定 | `user1.equals(user2)` — IDのみで判定 |

### 主な変更

- `User`, `Organization` エンティティに readonly / equals / reconstruct を追加
- 各エンティティにテストを追加（equals: 同一ID→true、異なるID→false、reconstruct: フィールド復元の検証）

### 効果

- フィールドの不変性がコンパイラによって保証される
- 復元と新規作成の意図がコードレベルで明確になった
- 将来のデータマイグレーション時に `reconstruct` 内で補正ロジックを追加できる

---

## Priority 4: エラーハンドリングの型安全化 + グローバル例外ハンドラ

### 目的

1. 将来のビジネスルール違反をドメインエラーとして型安全に表現するための `DomainResult` 型を整備する
2. Lambda ハンドラにグローバルな例外ハンドラを導入し、エラーに応じたHTTPレスポンスを返す仕組みを構築する

### 設計方針

**エラーの分類と対応方法:**

| 種別 | 例 | 対応方法 |
|------|-----|---------|
| 予期しないエラー（バグ、インフラ障害） | 作成直後のユーザーが取得できない | `throw`（従来通り）→ `@middy/http-error-handler` が 500 を返す |
| 期待されるドメインエラー（ビジネスルール違反） | 組織の定員オーバー、重複メンバー | `DomainResult` で返す → Lambda ハンドラが適切なHTTPステータスにマッピング |
| バリデーションエラー（入力値不正） | Zodスキーマ違反 | `zodParseErrorHandler` が ParseError を 400 に変換 |

**現時点での判断**: `createUser` には明示的なビジネスルール違反が存在しない（冪等設計のため）。`DomainResult` はインフラとして整備し、ビジネスルールが追加された時点で適用する。現時点で `createUser` の戻り値は `Promise<UserId>` のまま変更しない。

### 導入したもの

**1. `DomainResult` 型（`src/domains/commons/DomainResult.ts`）**

```typescript
export type DomainError = { code: string, message: string }

export type DomainResult<T, E extends DomainError = DomainError> =
  | { successful: true, domainValue: T }
  | { successful: false, domainError: E }

export function succeed<T>(domainValue: T): DomainResult<T, never>
export function fail<E extends DomainError>(domainError: E): DomainResult<never, E>
```

**2. HTTPレスポンスユーティリティ（`src/lambda/commons/httpResponse.ts`）**

| 関数 | 役割 | 使い方 |
|------|------|--------|
| `httpValue(value, statusCode?)` | 成功レスポンスを生成（デフォルト200） | `return httpValue({ userId })` |
| `httpError(statusCode, domainError)` | DomainErrorをHTTPエラーに変換 | `throw httpError(409, result.domainError)` |

レスポンスボディには `{ code, message }` の両方が含まれる。

**3. グローバル例外ハンドラ（middyミドルウェアチェーン）**

```typescript
export const handler = middy()
  .use(httpErrorHandler({ logger: error => logger.error('Unhandled error', { error }) }))
  .use(zodParseErrorHandler())
  .use(injectLambdaContext(logger))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .use(parser({ schema: ... }))
  .handler(lambdaHandler)
```

- `httpErrorHandler`: 全未処理エラーをキャッチ。`statusCode` 付きならそのステータスで、なければ500で返す。PowerTools Loggerでエラーを記録
- `zodParseErrorHandler`: `@aws-lambda-powertools/parser` の `ParseError` を 400 に変換（`@middy/http-error-handler` の `errorMappingFn` がv5に存在しないため独自ミドルウェアで対応）

**4. 追加パッケージ**

| パッケージ | 用途 |
|-----------|------|
| `@middy/http-error-handler` | グローバル例外ハンドラ |
| `http-errors` | HTTPステータスコード付きエラー生成 |
| `@types/http-errors` | TypeScript型定義（devDependencies） |

### 将来のドメインエラー追加パターン（参考）

ビジネスルールが追加された場合、以下のパターンで利用する。

```typescript
// ドメイン関数
export type CreateUserError = DomainError & { code: 'USER_ALREADY_IN_ORGANIZATION' }

export async function createUser(args, deps): Promise<DomainResult<UserId, CreateUserError>> {
  if (alreadyMember) {
    return fail({ code: 'USER_ALREADY_IN_ORGANIZATION', message: '...' })
  }
  return succeed(targetUser.id)
}

// Lambdaハンドラ
const result = await createUser(input, deps)
if (!result.successful) {
  switch (result.domainError.code) {
    case 'USER_ALREADY_IN_ORGANIZATION':
      throw httpError(409, result.domainError)
  }
}
return httpValue({ userId: result.domainValue.value })
```

### 効果

- Lambda ハンドラで全エラーが適切なHTTPレスポンスに変換される（500一律の状態から脱却）
- Zodバリデーション失敗が正しく400で返る
- 未処理エラーがPowerTools Loggerに記録される
- ドメインエラーの型定義とHTTPレスポンスへの変換パターンが確立された

---

## 改善後のアーキテクチャ全体像

```
src/
├── domains/                          ← ドメイン層（ビジネスルール）
│   ├── commons/
│   │   ├── ImmutableValueObject.ts    値オブジェクト基底
│   │   ├── StringValueObject.ts       文字列値オブジェクト基底
│   │   ├── IFunctionRequestContext.ts オブザーバビリティIF [P2]
│   │   ├── ILogger / ITracer / IMetrics  各IF [P2]
│   │   └── DomainResult.ts           Result型 + エラー型 [P4]
│   ├── user/
│   │   ├── user.ts                    エンティティ（readonly/equals/reconstruct）[P3]
│   │   ├── valueObjects/              値オブジェクト群
│   │   └── repositories/             リポジトリIF 4つ [P1]
│   └── organization/
│       ├── organization.ts            エンティティ [P3]
│       └── valueObjects/
│
├── functions/                        ← アプリケーション層（ユースケース）
│   └── userLogic/
│       ├── createUser.ts              パラメータインジェクション [P1]
│       └── queryUsers.ts
│
├── infrastructures/                  ← インフラ層（具象実装）
│   ├── keycloak/
│   │   └── keycloakUserRepository.ts  Gateway + Context受取 [P1][P2]
│   └── postgresql/
│       └── postgresqlUserQueryRepository.ts
│
├── lambda/                           ← Lambda層（Composition Root）
│   ├── commons/
│   │   ├── httpResponse.ts            httpValue / httpError [P4]
│   │   └── zodParseErrorHandler.ts    ParseError→400変換 [P4]
│   ├── createUser/
│   │   └── index.ts                   middy + httpErrorHandler [P4]
│   └── queryUsers/
│       └── index.ts
│
└── runtime/                          ← ランタイム層（設定・接続管理）
    ├── functionRequestContext.ts       PowerTools実装 [P2]
    ├── keycloakConfig.ts / keycloakGateway.ts    [P2]
    └── postgresqlConfig.ts / postgresqlGateway.ts [P2]
```

**依存方向（すべて内側→外側の一方向）:**

```
lambda → functions → domains ← infrastructures
                       ↑
                     runtime
```

## テスト結果

全15ファイル・57テストがパス。各Priority実装後にテスト全パス・TypeScript型チェック通過を確認済み。
