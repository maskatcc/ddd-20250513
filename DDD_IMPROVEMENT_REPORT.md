# DDD改善プロジェクト レポート

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-04-04 | Priority 1: リポジトリインターフェース導入 + パラメータインジェクション |
| 2026-04-04 | Priority 2: FunctionContext分離 + Config/Gateway分離 |
| 2026-04-04 | Priority 3: エンティティの充実（readonly / equals / reconstruct） |
| 2026-04-04 | Priority 4: エラーハンドリングの型安全化 + グローバル例外ハンドラ |
| 2026-04-06 | Priority 5: FunctionContextスコープ分離 + 高階関数パターン + middyバンドル |

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

## Priority 5: FunctionContextスコープ分離 + 高階関数パターン + middyバンドル

### 背景

Priority 1〜4 の改善により、DDD 4層アーキテクチャの依存関係は整理されたが、Lambda ハンドラの内部構造にはいくつかの問題が残っていた。

| 課題 | 影響 |
|------|------|
| `IFunctionRequestContext` の Logger/Tracer/Metrics はモジュールスコープで生成されるが、middyミドルウェアがリクエストごとに requestId 等を注入する。**インスタンスのライフサイクルと内部状態のスコープにギャップ**がある | requestId の取り違いが静的に検出できない。PowerTools のミドルウェアが暗黙的に解決している前提に依存しており、意図が不明確 |
| 各 Lambda ハンドラが同一の middy ミドルウェア群（httpErrorHandler, zodParseErrorHandler, injectLambdaContext, captureLambdaHandler, logMetrics）を個別にセットアップしている | ハンドラ追加のたびにボイラープレートが増殖。ミドルウェアの順序ミスや追加漏れのリスク |
| ドメインロジックが `createUser(input, deps)` の形式で、deps/context の組み立てがハンドラ内に散在 | Composition Root としての責務が曖昧。ドメインロジックの階層化（オーケストレーション）時に context 伝搬が煩雑になる |
| Gateway のインスタンス管理がハンドラ内の遅延初期化パターン | PowerTools（Logger, Tracer, Metrics）と異なるライフサイクルパターンが混在し、認知負荷が高い |

これらを4つの施策（5a〜5d）で段階的に解決した。各ステップ後にテスト全パス・型チェック通過を確認している。

---

### 5a. FunctionContext のスコープ分離

#### 目的

モジュールスコープ（cold start で生成、warm invocation で再利用）とリクエストスコープ（毎リクエスト生成）を型レベルで分離し、requestId の取り違い等を静的に防止する。

#### 設計方針

| コンテキスト | スコープ | 責務 |
|-------------|---------|------|
| `IFunctionModuleContext` | モジュール | 生のオブザーバビリティツール（ILogger, ITracer, IMetrics）の保持 |
| `IFunctionRequestContext` | リクエスト | 型付きオブザーバビリティメソッド（requestId/functionName 自動付与） + `raw` 経由で生ツールにアクセス |

**`raw` プロパティの命名理由**: PowerTools のオブジェクトに直接アクセスする低レベル操作であることを明示する。`runtime` や `module` も候補に挙がったが、利用側で「加工されていない生のツールを使う」という意図が最も伝わる名前として採用した。

#### ドメイン層インターフェース

```typescript
// src/domains/commons/IFunctionModuleContext.ts（新規）
export interface IFunctionModuleContext {
  logger: ILogger
  tracer: ITracer
  metrics: IMetrics
}

// src/domains/commons/IFunctionRequestContext.ts（変更）
export interface IFunctionRequestContext {
  /** モジュールスコープの生ツールへのアクセス */
  raw: IFunctionModuleContext

  /** 構造化ログ — requestId/functionName を自動付与 */
  logInfo(message: string, extra?: Record<string, unknown>): void
  logWarn(message: string, extra?: Record<string, unknown>): void
  logError(message: string, error?: Error, extra?: Record<string, unknown>): void
}
```

#### runtime層実装

```typescript
// src/runtime/functionModuleContext.ts（新規）
export class FunctionModuleContext implements IFunctionModuleContext {
  constructor(
    readonly logger: Logger,    // PowerTools
    readonly tracer: Tracer,
    readonly metrics: Metrics,
  ) {}

  static async create(options?: { serviceName?: string }): Promise<FunctionModuleContext> {
    // 将来: Secrets Manager等からの設定読み込みをここに追加
    const serviceOpts = options?.serviceName ? { serviceName: options.serviceName } : undefined
    return new FunctionModuleContext(
      new Logger(serviceOpts),
      new Tracer(serviceOpts),
      new Metrics(serviceOpts),
    )
  }
}

// src/runtime/functionRequestContext.ts（変更）
export class FunctionRequestContext implements IFunctionRequestContext {
  constructor(
    readonly raw: FunctionModuleContext,
    private readonly requestId: string,
    private readonly functionName: string,
  ) {}

  logInfo(message: string, extra?: Record<string, unknown>): void {
    this.raw.logger.info(message, {
      requestId: this.requestId, functionName: this.functionName, ...extra,
    })
  }
  // logWarn, logError も同様
}

export function createRequestContext(
  moduleContext: FunctionModuleContext,
  lambdaContext: LambdaContext,
): FunctionRequestContext {
  return new FunctionRequestContext(
    moduleContext, lambdaContext.awsRequestId, lambdaContext.functionName,
  )
}
```

**`FunctionModuleContext.create()` が `async` である理由**: 現時点では同期的な初期化のみだが、将来 Secrets Manager 等からの設定読み込みを追加する際にシグネチャ変更が不要。Lambda のトップレベル `await` と組み合わせて使用する。

#### テスト共通モック

```typescript
// src/runtime/mockFunctionRequestContext.ts（新規）
export const mockRequestContext: IFunctionRequestContext = {
  raw: {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    tracer: { getSegment: () => undefined, setSegment: vi.fn(), putAnnotation: vi.fn(), putMetadata: vi.fn() },
    metrics: { addMetric: vi.fn(), addDimension: vi.fn() },
  },
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}
```

テストファイルから重複するモック定義を排除し、`mockRequestContext` として一元管理する。

#### tsconfig.json の変更

```diff
- "target": "es2016",
+ "target": "es2022",
```

トップレベル `await`（`const moduleContext = await FunctionModuleContext.create()`）の使用に `es2022` 以上が必要。Lambda の Node.js 20/22 ランタイムは ES2022 を完全サポートしている。

---

### 5b. ドメインロジックの高階関数化 + depsFactory パターン

#### 目的

ドメインロジックの依存解決を統一されたパターンに整理し、context の伝搬を明示的かつ型安全にする。Lambda ハンドラの Composition Root としての役割を明確化する。

#### 設計方針

- ドメインロジックは `domainLogic(depsFactory)(context, input)` の高階関数形式
- 各ドメインロジックが**自身が要求する deps 型を定義**（ISP: Interface Segregation Principle）
- `depsFactory` は `(context: IFunctionRequestContext) => Deps` 型。Lambda ハンドラ（Composition Root）で1つ定義
- TypeScript の構造的部分型により、depsFactory が返すオブジェクトが各ドメインロジックの要求する型のスーパーセットであれば型チェックが通る

#### 変更前後の比較

```typescript
// 変更前: deps を直接引数で受け取る
export async function createUser(input: CreateUserInput, deps: CreateUserDeps): Promise<UserId> {
  // ...
}
// ハンドラ内での呼び出し
const userId = await createUser(input, { userRepository, userOrganizationRepository, ... })

// 変更後: 高階関数 + depsFactory パターン
export function createUser(depsFactory: CreateUserDepsFactory) {
  return async (context: IFunctionRequestContext, input: CreateUserInput): Promise<UserId> => {
    const { userRepository, userOrganizationRepository, userNotificationRepository } = depsFactory(context)
    // ...
  }
}
// ハンドラ内での呼び出し
const userId = await createUser(depsFactory)(context, input)
```

#### ドメインロジックの実装パターン

```typescript
// src/functions/userLogic/createUser.ts
export type CreateUserDeps = {
  userRepository: IUserRepository
  userOrganizationRepository: IUserOrganizationRepository
  userNotificationRepository: IUserNotificationRepository
}
export type CreateUserDepsFactory = (context: IFunctionRequestContext) => CreateUserDeps

export type CreateUserInput = {
  organizationId: OrganizationId
  email: Email
  userName: UserName
}

export function createUser(depsFactory: CreateUserDepsFactory) {
  return async (context: IFunctionRequestContext, input: CreateUserInput): Promise<UserId> => {
    const { userRepository, userOrganizationRepository, userNotificationRepository } = depsFactory(context)
    // ビジネスロジック（変更なし）
  }
}
```

#### 階層化されたドメインロジックでの利用パターン（参考）

ドメインロジックが別のドメインロジックを呼び出す場合も、同じ `depsFactory` を伝搬する。

```typescript
export function orchestrateOnboarding(depsFactory: OnboardingDepsFactory) {
  return async (context: IFunctionRequestContext, input: OnboardingInput) => {
    // リポジトリアクセスは depsFactory(context) で直接取得
    const { auditRepository } = depsFactory(context)
    await auditRepository.log(...)

    // 別のドメインロジック呼び出しはインライン（高階関数スコープで事前束縛しない）
    const userId = await createUser(depsFactory)(context, input.user)
    await assignOrganization(depsFactory)(context, { userId, ...input.org })
    return userId
  }
}
```

**事前束縛しない理由**: 同じドメインロジック関数を繰り返し呼び出すケースは少なく、束縛すると変数名の命名が困難になる。`createUser(depsFactory)(context, input)` のインライン呼び出しの方が意図が明確。

#### テストでの呼び出し

テストでは input を変数に代入せず、インラインで記述する（テストの見通しを優先）。

```typescript
// テスト
const result = await createUser(() => deps)(mockRequestContext, { organizationId, email, userName })
```

Lambda ハンドラでは input を明示的に代入する（値オブジェクトの初期化をガード節として扱う）。

```typescript
// Lambda ハンドラ
const input = {
  organizationId: new OrganizationId(authorizer.context.organizationId),
  email: new Email(event.body.email),
  userName: new UserName(event.body.userName),
}
const userId = await createUser(depsFactory)(context, input)
```

---

### 5c. middy ミドルウェアバンドル

#### 目的

全 Lambda ハンドラに共通する middy ミドルウェアチェーンを一箇所にバンドルし、セットアップのボイラープレートと順序ミスのリスクを排除する。

#### 設計方針

- `commonMiddleware<TEvent>(moduleContext)` ファクトリで共通チェーンを生成
- ハンドラ固有のミドルウェア（`refreshGateway`, `parser`）は `.use()` メソッドでチェーン追加
- `lambdaHandler` 関数の定義と middy セットアップ（`export const handler`）は分離する。ハンドラ関数は複雑になりうるため混在させない

#### 実装

```typescript
// src/middleware/commonMiddleware.ts（新規）
export function commonMiddleware<TEvent>(moduleContext: FunctionModuleContext) {
  const { logger, tracer, metrics } = moduleContext

  const chain = middy<TEvent, APIGatewayProxyResult>()
    .use(httpErrorHandler({ logger: error => logger.error('Unhandled error', { error }) }))
    .use(zodParseErrorHandler())
    .use(injectLambdaContext(logger))
    .use(captureLambdaHandler(tracer))
    .use(logMetrics(metrics))

  return {
    use(middleware: Parameters<typeof chain.use>[0]) {
      chain.use(middleware)
      return this
    },
    handler(fn: (event: TEvent, lambdaContext: LambdaContext) => Promise<APIGatewayProxyResult>) {
      return chain.handler(fn)
    },
  }
}
```

**`use()` の型が `Parameters<typeof chain.use>[0]` である理由**: middy の `use()` は内部的にジェネリクスの制約が複雑で、`MiddlewareObj` を直接指定すると型パラメータの不一致が起きる。`Parameters<typeof chain.use>[0]` で middy 側の型推論に委ねることで、任意のミドルウェアを型安全に受け入れる。

#### ファイル移動

`src/lambda/commons/zodParseErrorHandler.ts` → `src/middleware/zodParseErrorHandler.ts` に移動。Lambda 固有ではなくミドルウェア層の責務であるため。内容は変更なし。

#### 変更前後の比較

```typescript
// 変更前: 各ハンドラで個別にセットアップ
import middy from '@middy/core'
import httpErrorHandler from '@middy/http-error-handler'
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware'
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware'
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware'
import { Logger } from '@aws-lambda-powertools/logger'
import { Tracer } from '@aws-lambda-powertools/tracer'
import { Metrics } from '@aws-lambda-powertools/metrics'
// ... 6つのミドルウェアを手動でチェーン

// 変更後: commonMiddleware で一括
import { commonMiddleware } from '../../middleware/commonMiddleware.js'

export const handler = commonMiddleware<CreateUserEvent>(moduleContext)
  .use(refreshGateway(keycloakGateway))
  .use(parser({ schema: CreateUserEventSchema }))
  .handler(lambdaHandler)
```

Lambda 層から `@aws-lambda-powertools/logger`, `@aws-lambda-powertools/tracer`, `@aws-lambda-powertools/metrics` の直接 import が完全に消滅した（`parser/middleware` は除く）。

---

### 5d. Gateway のモジュールスコープ初期化 + refreshGateway ミドルウェア

#### 目的

Gateway のライフサイクルを PowerTools と同一パターン（モジュールスコープでインスタンス生成、middy ミドルウェアでリクエスト前の状態管理）に統一する。

#### 設計方針: PowerTools との対称性

| | インスタンス生成（module scope） | middy ミドルウェア（request scope） |
|---|---|---|
| Logger | `new Logger()` | `injectLambdaContext(logger)` — requestId 注入 |
| Tracer | `new Tracer()` | `captureLambdaHandler(tracer)` — セグメント管理 |
| Metrics | `new Metrics()` | `logMetrics(metrics)` — メトリクスフラッシュ |
| **Gateway** | **`new KeycloakGateway(config)`** | **`refreshGateway(gateway)` — トークンリフレッシュ等** |

#### 実装

```typescript
// src/middleware/refreshGateway.ts（新規）
interface Refreshable {
  refresh(): Promise<void>
}

export const refreshGateway = (gateway: Refreshable): MiddlewareObj => ({
  before: async () => {
    await gateway.refresh()
  },
})
```

```typescript
// Gateway クラスに refresh() メソッドを追加
// src/runtime/keycloakGateway.ts
export class KeycloakGateway {
  // ...
  async refresh(): Promise<void> {
    // 将来: トークンの有効期限チェック・リフレッシュをここに追加
  }
}

// src/runtime/postgresqlGateway.ts
export class PostgresqlGateway {
  // ...
  async refresh(): Promise<void> {
    // 将来: 接続ヘルスチェック等をここに追加
  }
}
```

#### 変更前後の比較

```typescript
// 変更前: ハンドラ内で遅延初期化
let cachedGateway: KeycloakGateway | undefined
async function lambdaHandler(...) {
  if (!cachedGateway) {
    cachedGateway = new KeycloakGateway(await KeycloakConfig.fromEnvironment())
  }
  // ...
}

// 変更後: トップレベル await でモジュールスコープに
const keycloakGateway = new KeycloakGateway(await KeycloakConfig.fromEnvironment())

export const handler = commonMiddleware<CreateUserEvent>(moduleContext)
  .use(refreshGateway(keycloakGateway))  // PowerToolsと同じパターン
  .use(parser({ schema: CreateUserEventSchema }))
  .handler(lambdaHandler)
```

---

### Lambda ハンドラの完成形

5a〜5d の全施策を適用した Lambda ハンドラの最終形を示す。

```typescript
// src/lambda/createUser/index.ts
import { parser } from '@aws-lambda-powertools/parser/middleware'
import { Context as LambdaContext, APIGatewayProxyResult } from 'aws-lambda'
import { commonMiddleware } from '../../middleware/commonMiddleware.js'
import { refreshGateway } from '../../middleware/refreshGateway.js'
import { FunctionModuleContext } from '../../runtime/functionModuleContext.js'
import { createRequestContext } from '../../runtime/functionRequestContext.js'
import { KeycloakGateway, KeycloakConfig } from '../../runtime/keycloakGateway.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, UserName } from '../../domains/user/user.js'
import { createUser, CreateUserDepsFactory } from '../../functions/userLogic/createUser.js'
import { KeycloakUserRepository } from '../../infrastructures/keycloak/keycloakUserRepository.js'
import { CreateUserEvent, CreateUserEventSchema } from './schema.js'
import { httpValue } from '../commons/httpResponse.js'

// モジュールスコープで初期化（warm invocationで再利用）
const moduleContext = await FunctionModuleContext.create()
const keycloakGateway = new KeycloakGateway(await KeycloakConfig.fromEnvironment())

// Composition Root: depsFactory の定義
const depsFactory: CreateUserDepsFactory = (context) => {
  const repo = new KeycloakUserRepository(keycloakGateway, context)
  return {
    userRepository: repo,
    userOrganizationRepository: repo,
    userNotificationRepository: repo,
  }
}

// ハンドラ関数: ビジネスロジックに集中
async function lambdaHandler(event: CreateUserEvent, lambdaContext: LambdaContext): Promise<APIGatewayProxyResult> {
  const context = createRequestContext(moduleContext, lambdaContext)
  const authorizer = event.requestContext.authorizer.lambda
  const input = {
    organizationId: new OrganizationId(authorizer.context.organizationId),
    email: new Email(event.body.email),
    userName: new UserName(event.body.userName),
  }
  const userId = await createUser(depsFactory)(context, input)
  return httpValue({ userId: userId.value })
}

// middy セットアップ（ハンドラ関数と分離）
export const handler = commonMiddleware<CreateUserEvent>(moduleContext)
  .use(refreshGateway(keycloakGateway))
  .use(parser({ schema: CreateUserEventSchema }))
  .handler(lambdaHandler)
```

---

### 参考: context 伝搬手段の比較

本設計（明示的パラメータ + depsFactory）の採用理由を、代替手段との比較で示す。

| 手段 | context 伝搬 | 型安全性 | テスト容易性 | 評価 |
|------|------------|---------|------------|------|
| **明示的パラメータ + depsFactory（採用）** | 明示的 | 完全 | 高い（context をモックで差し替え可） | パラメータが増えるが、depsFactory で集約される |
| AsyncLocalStorage（Node.js CLS） | 暗黙的 | なし（実行時に `getStore()` で取得） | 低い（テスト時に CLS セットアップ必要） | 型で強制できない。取得忘れが実行時エラー |
| Reader Monad / Effect | 型レベルで合成 | 完全 | 高い | TypeScript + Lambda の実務では抽象が過剰 |

**採用理由:**
- **型安全性**: リクエスト情報の取り違い防止が設計動機。暗黙的な伝搬（AsyncLocalStorage）では目的を達成できない
- **depsFactory が context 伝搬のハブ**: リポジトリへの context 注入が `depsFactory(context)` の1箇所に集約。ドメインロジック内でリポジトリを個別に new して context を渡す必要がない
- **`(context, input)` シグネチャの統一**: 階層化されたドメインロジックでも自然に伝搬する
- **構造的部分型による deps スコープ制限**: context は同じだが、見える deps は各ドメインロジックの型定義で制限される（ISP）

### context 伝搬の全体像

```
Lambda handler
  → createRequestContext(moduleContext, lambdaContext)  // context 生成
  → createUser(depsFactory)(context, input)            // ドメインロジックへ
    → depsFactory(context)                              // repos 生成時に注入
      → new Repository(gateway, context)                // repo が context を保持
        → context.logInfo(...)                          // 構造化ログ出力
```

---

### 修正対象ファイル一覧

| ファイル | 操作 | 施策 |
|----------|------|------|
| `src/domains/commons/IFunctionModuleContext.ts` | 新規作成 | 5a |
| `src/domains/commons/IFunctionRequestContext.ts` | 変更（raw + 型付きログメソッド） | 5a |
| `src/runtime/functionModuleContext.ts` | 新規作成 | 5a |
| `src/runtime/functionRequestContext.ts` | 変更（FunctionModuleContext 参照 + requestId/functionName） | 5a |
| `src/runtime/mockFunctionRequestContext.ts` | 新規作成（テスト共通モック） | 5a |
| `tsconfig.json` | 変更（target: es2016 → es2022） | 5a |
| `src/functions/userLogic/createUser.ts` | 変更（高階関数化 + DepsFactory 型定義） | 5b |
| `src/functions/userLogic/queryUsers.ts` | 変更（同上） | 5b |
| `src/functions/userLogic/createUser.test.ts` | 変更（mockRequestContext 使用 + 高階関数呼び出し） | 5a, 5b |
| `src/functions/userLogic/queryUsers.test.ts` | 変更（同上） | 5a, 5b |
| `src/middleware/commonMiddleware.ts` | 新規作成 | 5c |
| `src/middleware/zodParseErrorHandler.ts` | 移動（lambda/commons から） | 5c |
| `src/middleware/refreshGateway.ts` | 新規作成 | 5d |
| `src/runtime/keycloakGateway.ts` | 変更（refresh() メソッド追加） | 5d |
| `src/runtime/postgresqlGateway.ts` | 変更（refresh() メソッド追加） | 5d |
| `src/lambda/createUser/index.ts` | 変更（commonMiddleware + depsFactory + Gateway 外出し） | 5a-d |
| `src/lambda/queryUsers/index.ts` | 変更（同上） | 5a-d |
| `src/lambda/createUser/index.test.ts` | 変更（Gateway mock 修正） | 5d |
| `src/lambda/queryUsers/index.test.ts` | 変更（Gateway mock 修正） | 5d |
| `src/infrastructures/keycloak/keycloakUserRepository.ts` | 変更（context 型の変更に追従） | 5a |
| `src/infrastructures/postgresql/postgresqlUserQueryRepository.ts` | 変更（同上） | 5a |
| `src/infrastructures/postgresql/postgresqlUserQueryRepository.test.ts` | 変更（mockRequestContext 使用） | 5a |
| `src/lambda/commons/zodParseErrorHandler.ts` | 削除 | 5c |
| `src/middleware/.gitkeep` | 削除 | 5c |

### 効果

- **スコープの明確化**: モジュールスコープとリクエストスコープが型レベルで分離され、requestId の取り違いがコンパイル時に検出される
- **ボイラープレートの排除**: Lambda 層から PowerTools（Logger/Tracer/Metrics）の直接 import が消滅。ミドルウェアセットアップが `commonMiddleware` に一元化
- **統一されたドメインロジックパターン**: `domainLogic(depsFactory)(context, input)` で全ドメインロジックのシグネチャが統一。階層化にも自然に対応
- **Gateway ライフサイクルの標準化**: PowerTools と同一のモジュールスコープ初期化 + middy ミドルウェアパターンに統一
- **テスト共通化**: `mockRequestContext` の一元管理により、テストファイル間のモック定義の重複を排除

---

## 改善後のアーキテクチャ全体像

```
src/
├── domains/                          ← ドメイン層（ビジネスルール）
│   ├── commons/
│   │   ├── ImmutableValueObject.ts    値オブジェクト基底
│   │   ├── StringValueObject.ts       文字列値オブジェクト基底
│   │   ├── IFunctionModuleContext.ts  モジュールスコープIF [P5a]
│   │   ├── IFunctionRequestContext.ts リクエストスコープIF（raw + 型付きログ）[P2][P5a]
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
│       ├── createUser.ts              高階関数 + DepsFactory [P1][P5b]
│       └── queryUsers.ts             同上 [P5b]
│
├── infrastructures/                  ← インフラ層（具象実装）
│   ├── keycloak/
│   │   └── keycloakUserRepository.ts  Gateway + Context受取 [P1][P2]
│   └── postgresql/
│       └── postgresqlUserQueryRepository.ts
│
├── middleware/                       ← ミドルウェア層 [P5c][P5d]
│   ├── commonMiddleware.ts            middy共通チェーン [P5c]
│   ├── zodParseErrorHandler.ts        ParseError→400変換 [P4→P5c移動]
│   └── refreshGateway.ts             Gateway状態管理 [P5d]
│
├── lambda/                           ← Lambda層（Composition Root）
│   ├── commons/
│   │   ├── httpResponse.ts            httpValue / httpError [P4]
│   │   └── testEventTemplate.ts
│   ├── createUser/
│   │   └── index.ts                   commonMiddleware + depsFactory [P5a-d]
│   └── queryUsers/
│       └── index.ts                   同上 [P5a-d]
│
└── runtime/                          ← ランタイム層（設定・接続管理）
    ├── functionModuleContext.ts        モジュールスコープ実装 [P5a]
    ├── functionRequestContext.ts       リクエストスコープ実装 [P2][P5a]
    ├── mockFunctionRequestContext.ts   テスト共通モック [P5a]
    ├── keycloakConfig.ts / keycloakGateway.ts（refresh追加）[P2][P5d]
    └── postgresqlConfig.ts / postgresqlGateway.ts（refresh追加）[P2][P5d]
```

**依存方向（すべて内側→外側の一方向）:**

```
lambda → middleware → runtime → domains ← infrastructures
  └──────→ functions ──→ domains
```

**検証済みの依存ルール:**
- Lambda 層に PowerTools（`@aws-lambda-powertools/logger`, `tracer`, `metrics`）の直接 import がないこと（`parser/middleware` は除く）
- functions 層に `infrastructures/` の import がないこと

## テスト結果

全15ファイル・57テストがパス。各 Priority 実装後にテスト全パス・TypeScript 型チェック通過を確認済み。
