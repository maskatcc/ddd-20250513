# DDD改善プロジェクト レポート

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-04-04 | Priority 1: リポジトリインターフェース導入 + パラメータインジェクション |
| 2026-04-04 | Priority 2: FunctionContext分離 + Config/Gateway分離 |
| 2026-04-04 | Priority 3: エンティティの充実（readonly / equals / reconstruct） |
| 2026-04-04 | Priority 4: エラーハンドリングの型安全化 + グローバル例外ハンドラ |
| 2026-04-06 | Priority 5: FunctionContextスコープ分離 + 高階関数パターン + middyバンドル |
| 2026-04-07 | Priority 6: FunctionRequestContextのミドルウェア化 + アプリログ構造化 + 認証情報の保持 |
| 2026-04-09 | Priority 7: DomainResultの型安全性強化 — エラー宣言と伝搬 |
| 2026-04-11 | Priority 8: 想定外エラーの例外型設計 + traceId 統合 |

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

## Priority 6: FunctionRequestContextのミドルウェア化 + アプリログ構造化 + 認証情報の保持

### 背景

Priority 5 で `FunctionRequestContext` をモジュール/リクエストの2スコープに分離し、PowerTools / Gateway / parser の各ミドルウェアを `commonMiddleware` に集約した結果、Lambda ハンドラの定型処理は大幅に減った。しかしまだ次の課題が残っていた。

| 課題 | 影響 |
|------|------|
| `createRequestContext(moduleContext, lambdaContext)` の呼び出しが各ハンドラの冒頭に残っている | 新しい Lambda 追加のたびに同じ1行を書く必要がある。戻り値を使わなければビルドは通るので、書き忘れを型で検出できない |
| コンテキストのライフサイクルが分散している | 生成はハンドラ内、終了処理はどこにもない。「リクエスト開始ログ」「終了ログ」「duration 計測」を共通化できる集約点がない |
| アプリ視点のログとオブザーバビリティ視点のログが混在している | `logInfo('something')` と「リクエスト開始/終了」が同じレベルで出力され、CloudWatch Logs Insights でアプリ視点のフィルタが書きづらい |
| HTTP ヘッダー / Authorizer 情報がハンドラ・repo 層に散在 | 「誰が呼んだか」「どんなトークンで来たか」を構造化して扱う場所がない。repo 層がアクセストークンを参照したいときの公式な経路がなく、ハンドラから個別に渡す必要がある |

これらをフェーズ A・B の2段階で改善した。

### 設計方針

#### フェーズ A: コンテキストのライフサイクルを middy ミドルウェアへ

- **ライフサイクル整合性を出発点にする**: `FunctionRequestContext` のライフサイクルは Lambda の `Context` (per-invocation) と完全に一致する。両者を別オブジェクトで管理する積極的な理由はない
- **TypeScript declaration merging で `Context` を直接拡張する**: `aws-lambda` の `Context` に `requestContext?: FunctionRequestContext` を optional で追加。WeakMap や `request.internal` のような間接層を排除し、middleware が attach → ハンドラが直接読む素直な経路にする。Lambda 専業プロジェクトなので `Context` 型のグローバル拡張は意味的にも整合する
- **ハンドラのシグネチャ `(event, lambdaContext)` は変えない**: optional 型を non-null に narrow するヘルパー `requireRequestContext(lambdaContext)` を1行入れるだけで使える形にして、middy の handler ラッパーには手を加えない。ボイラープレートを増やさない最小の変更
- **`elapsedMs()` を `FunctionRequestContext` 自身に持たせる**: middleware は per-invocation でリクエストを共有するが、middleware オブジェクトは warm invocation 間で再利用される。クロージャ変数で start 時刻を持つと並行実行で破綻するため、状態はリクエストスコープのインスタンス（`FunctionRequestContext`）に閉じ込める

#### フェーズ B: アプリログの構造化と認証情報の保持

- **「アプリログ」を一級の概念として導入する**: 開発者が任意に呼ぶ `logInfo` 等とは別に、「リクエスト主体・状態の構造化記録」を `logApp(payload: AppLog)` として interface に定義。判別共用体の `AppLog` 型でイベントごとの必須フィールドを型で強制する
- **自動付与は `logApp` の内部に閉じる**: `requestId` / `functionName` / `headers` / `durationMs` は呼び出し側が書かない。middleware も末端の handler も、イベント固有部分（`statusCode` 等）だけを渡す。重複や付与忘れが構造的に起きない設計
- **ヘッダーマスクはブラックリスト方式**: 通常のヘッダーは観測可能性のために素通し、`Authorization` と `Referer` のみマスクする。「機微情報を誤って公開するリスク」と「ヘッダーが見えないことによるデバッグ困難」のトレードオフで前者を取る判断
- **`accessToken` は interface に出す、`headers` / `authorizer` は具象クラスに留める**: ドメイン層 (`IFunctionRequestContext`) に HTTP の生構造を漏らさないため。アクセストークンは「リクエスト主体性」という普遍概念として interface に置けるが、ヘッダーや authorizer の生 JSON はトランスポート詳細であり、ドメインが知るべきでない。`headers` / `authorizer` / `getAuthorizer<T>()` は `FunctionRequestContext` 具象クラスのみが持ち、handler 経由でしかアクセスできない
- **`getAuthorizer<T>()` で型責任を呼び出し側に渡す**: authorizer の context スキーマは Lambda ごとに違う。`FunctionRequestContext` 自体をジェネリック化すると `requireRequestContext` の戻り型まで波及してしまう。代わりに「`unknown` を保持し、取得時にジェネリックメソッドでキャスト」とすることで、ジェネリック化の波及をゼロに保ちつつ、ハンドラ内では型付きで扱える。型主張は実行時検証ではなく「ドキュメントとしての宣言」と割り切る
- **アプリログ専用の Logger インスタンスを分ける**: PowerTools Logger は固定フィールド（`cold_start`, `function_arn`, `function_memory_size`, `sampling_rate` 等）を必ず付与する。一般のオブザーバビリティログでは X-Ray 連携やコールドスタート検知のために有用だが、アプリログにとってはノイズ。両立のため `MinimalLogFormatter` を作り、`FunctionModuleContext` に `appLogger`（専用 Logger）を追加。`logInfo` 系は従来の logger、`logApp` のみ専用 logger を使う
- **`createRequestContext` は options object 形式に切り替え**: 引数が `headers` / `authorizer` / `accessToken` と増えたため、位置引数を捨てて名前付きオブジェクトにする。middleware からだけ呼ばれる関数なので、位置の暗黙ルールよりも可読性を優先する

### 主な変更

```
src/
├── domains/commons/
│   ├── appLog.ts                     [新規] AppLog 判別共用体（イベント固有部分のみ）
│   └── IFunctionRequestContext.ts    accessToken / logApp / elapsedMs を追加
├── runtime/
│   ├── minimalLogFormatter.ts        [新規] PowerTools 固定フィールドを除く LogFormatter
│   ├── functionModuleContext.ts      appLogger（MinimalLogFormatter 適用）を追加
│   ├── functionRequestContext.ts     declaration merging / startedAt / elapsedMs /
│   │                                 headers / authorizer / accessToken /
│   │                                 getAuthorizer<T>() / logApp / maskHeaders /
│   │                                 requireRequestContext /
│   │                                 createRequestContext を options 形式へ
│   └── mockFunctionRequestContext.ts accessToken / logApp を追加
├── middleware/
│   ├── requestContext.ts             [新規] before/after/onError で logApp 出力、
│   │                                 event から headers/authorizer/accessToken を抽出
│   └── commonMiddleware.ts           requestContextMiddleware を組み込み
├── lambda/
│   ├── createUser/index.ts           requireRequestContext + getAuthorizer に置換
│   └── queryUsers/index.ts           同上
└── schemas/
    └── lambdaAuthorizerSchema.ts     accessToken: z.string() を追加
```

### 効果

- **ハンドラの定型処理がさらに削減**: `createRequestContext` の呼び出しが消え、`requireRequestContext(lambdaContext)` の1行に置き換わる。`event.requestContext.authorizer.lambda` への直接アクセスも消滅し、`context.getAuthorizer<T>()` で型付きアクセス
- **アプリログが構造化されて検索しやすい**: CloudWatch Logs Insights で `event = "request.start"` や `durationMs > 1000` のようなクエリが直接書ける。`durationMs` が全 appLog エントリに自動付与されるため、レイテンシ分析が message 文字列に依存しない
- **アプリログのノイズが激減**: PowerTools 固定フィールドが除外され、appLog 1行が必要最小フィールドのみで読める
- **repo 層がアクセストークンを公式経路で取得**: `this.context.accessToken` を直接参照でき、authorizer.lambda の生構造を知らなくて済む。インターフェース経由なのでテスト時のモック差し替えも容易（`mockRequestContext` に `accessToken: 'mock-access-token'` を設定済み）
- **layering の原則を維持**: `IFunctionRequestContext` には `accessToken` / `logApp` のみ追加され、HTTP ヘッダーや authorizer の生 JSON はドメイン層に漏れない
- **並行安全性**: `startedAt` を `FunctionRequestContext` のインスタンスフィールドにすることで、middleware のクロージャ変数に依存しない設計。将来 provisioned concurrency や streamifyResponse を導入しても壊れない
- **書き忘れの検出可能性向上**: `requireRequestContext` は middleware 未登録時に明示的に例外を投げる。生成漏れが実行時の最初のリクエストで即座に発見される

### 出力イメージ（テスト時）

```json
{
  "level": "INFO",
  "message": "appLog",
  "timestamp": "2026-04-07T05:00:52.595Z",
  "functionName": "aws-lambda-mock-context",
  "durationMs": 0,
  "requestId": "c09aaf00-...",
  "headers": {
    "X-AMZ-Date": "20231001T000000Z",
    "Accept": "application/json",
    "Content-Type": "application/json"
  },
  "event": "request.start"
}
```

PowerTools 固定フィールド（`cold_start`, `function_arn`, `function_memory_size`, `sampling_rate` 等）は出力されない。一方、`logInfo` / `logWarn` / `logError` は従来通り PowerTools の標準フィールド付きで出力されるため、運用時のフィルタリング・X-Ray 連携を維持する。

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

---

## Priority 7: DomainResultの型安全性強化 — エラー宣言と伝搬

### 背景

Priority 4 で `DomainResult<T, E>` 型・`succeed()` / `fail()` 関数・`httpError()` ユーティリティを導入し、ドメインエラーを型で表現するインフラを整備した。しかし実際のドメインロジック（`createUser`, `queryUsers`）は冪等設計のためビジネスルール違反が存在せず、`DomainResult` は「型定義はあるが使われていない」状態だった。

このまま放置すると、将来ビジネスルールが追加された時点で以下の問題に直面する。

| 課題 | 影響 |
|------|------|
| `DomainError = { code: string, message: string }` の `code` が `string` 型 | 関数の戻り値型からエラー種別が読めない。`switch` 分岐の網羅性チェックが効かない |
| `httpError(statusCode, domainError)` の `statusCode` が呼び出し側の手書き数値 | `code` と HTTP ステータスの対応関係が型で表現されず、マッピング漏れが実行時まで分からない |
| `httpError` が `code` と `message` しかレスポンスボディに含めない | 構造化ペイロード（重複メールアドレス等）をクライアントに返せない。`message` 文字列に詰め込む運用になる |
| 階層化されたドメインロジック間でのエラー伝搬パターンが未定義 | 下位関数の失敗詳細（構造化 JSON）を上位でどう引き継ぐか、各実装者の判断に委ねられる |

Priority 7 では、**2 つの軸**でこれらを解決する。

### 設計方針

#### 軸 1: 各関数が「自身が返すエラーコード」を宣言する

ドメインロジックの戻り値型 `Promise<DomainResult<T, ErrorUnion>>` だけで「この関数はどのエラーを返しうるか」を静的に宣言できるようにする。呼び出し側は `switch(result.domainError.code)` で literal union の網羅性チェックを受けられる。

**`DomainError` のジェネリック化:**

```typescript
// 変更前
export type DomainError = { code: string, message: string }

// 変更後
export type DomainError<
  Code extends string = string,
  Payload extends Record<string, unknown> = Record<string, never>,
> = Readonly<
  { code: Code, message: string } &
  ([Payload] extends [Record<string, never>] ? {} : { payload: Payload })
>
```

- **`Code` ジェネリクス**: `string` → literal union（`'USER_EMAIL_ALREADY_REGISTERED'` 等）に絞ることで、`switch` の網羅性チェックが有効になる
- **`Payload` ジェネリクス**: エラーに付随する構造化データ（重複したメールアドレス等）を型安全に持たせる。未指定時（`Record<string, never>` = デフォルト）は `payload` フィールド自体が型から消える（条件型で制御）。これにより Payload を必要としないエラーは `{ code, message }` のみのシンプルな型になる
- **`Readonly`**: エラーオブジェクトの不変性を型レベルで保証

**ドメインエラー型の定義パターン:**

```typescript
// src/domains/commons/errors.ts

// Payload あり — { code, message, payload: { email } }
export type EmailAlreadyRegistered = DomainError<
  'USER_EMAIL_ALREADY_REGISTERED',
  { email: string }
>

// Payload なし — { code, message }
export type OrganizationNotFound = DomainError<'ORGANIZATION_NOT_FOUND'>
```

エラー型は `src/domains/commons/errors.ts` に集約する。ドメイン固有のエラーが増えた場合は、ドメイン単位のファイル（`src/domains/user/errors.ts` 等）に分割する選択肢もあるが、現時点ではエラー型が少数であり、横断的に参照されることも想定されるため commons に配置する。

**関数のエラー宣言:**

```typescript
// 将来ビジネスルールが追加された場合のイメージ
export type CreateUserError = EmailAlreadyRegistered | OrganizationNotFound

export function createUser(depsFactory: CreateUserDepsFactory) {
  return async (
    context: IFunctionRequestContext,
    input: CreateUserInput,
  ): Promise<DomainResult<UserId, CreateUserError>> => {
    // ...
    if (duplicated) {
      return fail<EmailAlreadyRegistered>({
        code: 'USER_EMAIL_ALREADY_REGISTERED',
        message: 'Email is already registered.',
        payload: { email: input.email.value },
      })
    }
    return succeed(targetUser.id)
  }
}
```

戻り値型 `DomainResult<UserId, CreateUserError>` を読むだけで「この関数は `USER_EMAIL_ALREADY_REGISTERED` と `ORGANIZATION_NOT_FOUND` の 2 種しか返さない」が分かる。

**`assertNever` ヘルパー:**

```typescript
export function assertNever(x: never): never {
  throw new Error(`Unhandled domain error: ${JSON.stringify(x)}`)
}
```

`switch` の `default` 節で使うことで、新しい code を追加した際に対応漏れがコンパイルエラーとして検出される。

#### 軸 2: 呼び出し元がエラーのとき、詳細（JSON）を上位に伝搬させる

ドメインロジックが別のドメインロジックを呼ぶ階層構造で、下位の失敗結果（構造化ペイロード付き）を**そのまま上位に返せる**パターンを確立する。

**伝搬パターン:**

```typescript
type OnboardingError = CreateUserError | AuditLogError

export function orchestrateOnboarding(depsFactory: OnboardingDepsFactory) {
  return async (
    ctx: IFunctionRequestContext,
    input: OnboardingInput,
  ): Promise<DomainResult<UserId, OnboardingError>> => {
    const userResult = await createUser(depsFactory)(ctx, input.user)
    if (!userResult.successful) return userResult   // ← 詳細 JSON がそのまま伝搬

    const auditResult = await writeAuditLog(depsFactory)(ctx, userResult.domainValue)
    if (!auditResult.successful) return auditResult
    return succeed(userResult.domainValue)
  }
}
```

- `CreateUserError ⊆ OnboardingError` の部分型関係により `if (!r.successful) return r` が型チェックを通る
- `domainError` オブジェクト（`code`, `message`, `payload`）がコピーなしでそのまま上位に伝わる
- 上位のエラー union に下位のエラー型を追加するだけで伝搬経路が型安全に成立する

**ヘルパーを導入しない理由:** `if (!r.successful) return r` で十分明示的であり、TypeScript の構造的部分型だけで伝搬が型安全に成立する。`flatMap`/`bind` 等の抽象は Lambda + サーバーレスの文脈では過剰。Priority 5 の「`depsFactory` を束縛せずインラインで呼ぶ」判断と同じ方針。

**HTTP レスポンスへの詳細 JSON 伝搬:**

最終的に Lambda ハンドラに届いた失敗は、`domainError` の全フィールドを HTTP レスポンスボディに展開する。

```typescript
// DomainErrorStatusMap — E のすべての code を網羅していることを型で強制
export type DomainErrorStatusMap<E extends DomainError> = {
  readonly [K in E['code']]: number
}

// httpDomainError — body は { code, message, payload? } 構造
export function httpDomainError<E extends DomainError>(
  domainError: E,
  statusMap: DomainErrorStatusMap<E>,
) {
  const error = createHttpError(statusMap[domainError.code as E['code']])
  const body: Record<string, unknown> = { code: domainError.code, message: domainError.message }
  if ('payload' in domainError) body.payload = domainError.payload
  error.message = JSON.stringify(body)
  return error
}
```

- `DomainErrorStatusMap<E>` は Mapped Types で `E['code']` の全 literal を key として要求する。`satisfies` と組み合わせることで、エラー種別の追加時に HTTP ステータスマッピングの追加漏れがコンパイルエラーになる
- 既存の `httpError(statusCode, domainError)` は後方互換のため残す。新規のドメインエラー経路は `httpDomainError` に寄せる
- `payload` フィールドの有無は `'payload' in domainError` で動的に判定し、あれば body に含める。Payload を持たないエラーのレスポンスボディは `{ code, message }` のまま

**Lambda ハンドラでの結果処理パターン:**

```typescript
// 将来ビジネスルールが追加された場合のイメージ
const result = await createUser(depsFactory)(context, input)
if (!result.successful) {
  throw httpDomainError(result.domainError, {
    USER_EMAIL_ALREADY_REGISTERED: 409,
    ORGANIZATION_NOT_FOUND: 404,
  } satisfies DomainErrorStatusMap<CreateUserError>)
}
return httpValue({ userId: result.domainValue.value })
```

- `satisfies` により、`CreateUserError` に新しい code を追加すると statusMap 側もコンパイル時に必須化される
- `satisfies` は型を絞らないので、statusMap の値型は `number` のまま保たれる

### 段階的な移行: `DomainResult<T, never>` ベース

現時点の `createUser` / `queryUsers` にはビジネスルール違反が存在しない（冪等設計のため）。しかし「機構を整備しただけで使わない」状態では死蔵のリスクがある。

そこで、**既存のドメインロジックの戻り値型を `Promise<DomainResult<T, never>>` に移行**し、パターンを確立する方針を採用した。

```typescript
// src/functions/userLogic/createUser.ts
export function createUser(depsFactory: CreateUserDepsFactory) {
  return async (
    context: IFunctionRequestContext,
    input: CreateUserInput,
  ): Promise<DomainResult<UserId, never>> => {
    // ... ビジネスロジック（変更なし）
    return succeed(targetUser.id)
  }
}
```

エラー型が `never` であることの意味:
- **関数シグネチャ**: 「この関数は現時点でドメインエラーを返さない」を型で明示。将来ビジネスルールが追加されたら `never` → `CreateUserError` に変えるだけ
- **ハンドラ側**: `DomainErrorStatusMap<never>` は空オブジェクト `{}` で `satisfies` が通る。エラー型が追加された瞬間にコンパイルエラーでマッピング追加を強制

```typescript
// src/lambda/createUser/index.ts
const result = await createUser(depsFactory)(context, input)
if (!result.successful) {
  throw httpDomainError(result.domainError, {} satisfies DomainErrorStatusMap<never>)
}
return httpValue({ userId: result.domainValue.value })
```

この段階的移行により、**ハンドラの構造変更なし**でビジネスルールを追加できる状態になった。

### 型レベルのテスト

型システムの挙動を `expect-type` で検証する contract テストを新設した。

```typescript
// src/domains/commons/DomainResult.contract.test.ts

describe('DomainError', () => {
  it('Payload 未指定時は payload フィールドが存在しない', () => {
    type E = DomainError<'NOT_FOUND'>
    expectTypeOf<E>().toEqualTypeOf<Readonly<{ code: 'NOT_FOUND', message: string }>>()
  })

  it('Payload 指定時は payload フィールドが型付きで存在する', () => {
    type E = DomainError<'DUPLICATED', { email: string }>
    expectTypeOf<E>().toEqualTypeOf<Readonly<{ code: 'DUPLICATED', message: string, payload: { email: string } }>>()
  })
})

describe('DomainErrorStatusMap', () => {
  it('code の網羅を強制する', () => {
    type E = DomainError<'A'> | DomainError<'B'>
    // @ts-expect-error — B 欠落でコンパイルエラー
    const _bad: DomainErrorStatusMap<E> = { A: 400 }
  })

  it('never の場合は空オブジェクトで通る')
})

describe('DomainResult 伝搬', () => {
  it('下位のエラー結果が上位の union に代入できる', () => {
    type Sub = DomainError<'A'>
    type Super = DomainError<'A'> | DomainError<'B'>
    expectTypeOf<DomainResult<number, Sub>>().toExtend<DomainResult<number, Super>>()
  })
})
```

### 主な変更

```
src/
├── domains/commons/
│   ├── DomainResult.ts                  DomainError<Code, Payload> ジェネリック化、
│   │                                    assertNever 追加
│   ├── errors.ts                        [新規] サンプルエラー型定義
│   │                                    （EmailAlreadyRegistered, OrganizationNotFound）
│   └── DomainResult.contract.test.ts    [新規] 型レベルの網羅性・伝搬テスト
├── functions/userLogic/
│   ├── createUser.ts                    戻り値 Promise<DomainResult<UserId, never>>、
│   │                                    succeed() で包む
│   ├── queryUsers.ts                    同上（DomainResult<UserQueryResult[], never>）
│   ├── createUser.test.ts              assert を { successful, domainValue } 形式に
│   └── queryUsers.test.ts              同上
└── lambda/
    ├── commons/httpResponse.ts          DomainErrorStatusMap<E>、httpDomainError 追加
    ├── createUser/index.ts              結果処理を httpDomainError + satisfies パターンに
    ├── createUser/index.test.ts         モック戻り値を DomainResult 形式に
    ├── queryUsers/index.ts              同上
    └── queryUsers/index.test.ts         同上
```

### 効果

- **エラー宣言の静的可読性**: 関数の戻り値型 `DomainResult<T, ErrorUnion>` を読むだけで、返しうるエラーの全集合が分かる。コードリーディング時に実装を辿る必要がない
- **網羅性チェックのコンパイル時強制**: `DomainErrorStatusMap<E>` + `satisfies` により、エラー種別の追加時に HTTP ステータスマッピングの追加漏れがコンパイルエラーになる。`assertNever` で `switch` 分岐の網羅性も保証
- **構造化ペイロードの型安全な伝搬**: `DomainError<Code, Payload>` でエラーに付随するデータを型付きで定義。`httpDomainError` がレスポンスボディに `{ code, message, payload }` 構造で展開。ドメインロジック→Lambda ハンドラ→HTTP レスポンスの全経路でフィールドが欠落しない
- **階層呼び出しでの透過的伝搬**: `if (!r.successful) return r` で下位の `domainError` がそのまま上位に伝わる。union 型の部分型関係で型安全性を担保
- **段階的移行の完了**: 既存ロジックを `DomainResult<T, never>` に移行済み。将来ビジネスルール追加時はエラー型の `never` を具体型に変えるだけで、ハンドラの構造変更は不要

---

## Priority 8: 想定外エラーの例外型設計 + traceId 統合

### 目的

「想定外エラー」に構造化された例外型を導入し、エラーレスポンスの形式を統一する。あわせて、クライアントからのエラー問い合わせ時にログを特定できるよう、全エラーレスポンスに traceId を含める。

### 背景

Priority 7 までで「期待されるビジネスエラー」は `DomainResult<T, E>` で型安全に扱えるようになった。しかし「想定外エラー」——値オブジェクトのバリデーション失敗、authorizer 未設定、作成直後の findById 失敗——はすべて `throw new Error('message')` のままだった。middy の `httpErrorHandler` がこれらを一律 500 で返すため、以下の問題があった。

| 分類 | 現状の例 | 問題 |
|------|---------|------|
| 入力バリデーション | 値オブジェクトコンストラクタの `throw` | 本来 400 だが 500 で返る。メッセージも非公開 |
| 構成ミス | authorizer 未設定、middleware 未登録 | エラーの種別が不明。運用上の原因特定が困難 |
| 内部整合性 | 作成直後の findById 失敗、未実装メソッド | デバッグ情報がログに残らない |

さらに、エラーレスポンスの形式がドメインエラー（`{ code, message, payload? }`）と想定外エラー（middy デフォルトの `{ message }` のみ）で異なっていた。クライアントがエラー種別を判定するには `code` フィールドが必須だが、想定外エラーにはそれがなかった。

もう一つの課題として、エラー発生時のログ特定がある。クライアントからエラーについて問い合わせを受けたとき、該当リクエストのログを特定する手段がなかった。traceId をレスポンスに含めることで、クライアントは「このエラーの traceId は `abc-123` です」と報告でき、運用チームはその traceId でログを検索して原因調査できる。

### 設計方針

#### エラーの二系統（DomainResult vs AppException）

エラーを「期待されるもの」と「想定外のもの」の二系統に明確に分離する。

- **DomainResult<T, E>**: 期待されるビジネスエラー。戻り値として返す（制御フロー）
- **AppException**: 想定外エラー。throw する（例外フロー）

この二系統は設計意図が異なる。DomainResult は「この関数はこのエラーを返しうる」を型で宣言する。AppException は「本来ここに到達すべきでない」を表明する。混同すると、ビジネスルールの網羅性チェック（`satisfies`）が機能しなくなる。

#### なぜ3種だけか

全 throw サイトを分類すると3種に収まる。

| 例外クラス | code | statusCode | expose | 用途 |
|-----------|------|-----------|--------|------|
| `ValidationException` | `VALIDATION_ERROR` | 400 | true | クライアント入力の不正（値オブジェクトのバリデーション失敗） |
| `ConfigurationException` | `CONFIGURATION_ERROR` | 500 | false | 環境・構成の問題（authorizer 未設定、middleware 未登録） |
| `InternalException` | `INTERNAL_ERROR` | 500 | false | 内部整合性違反・未実装（作成直後の findById 失敗） |

将来インフラ層の実装が進んだ際に `InfrastructureException (503)` を追加する余地はあるが、今は存在しないエラーの型を作らない。

#### エラーレスポンスの統一形式

全エラーレスポンスを `{ code, message, traceId, payload? }` に統一する。AppException でもドメインエラーでも、クライアントは常に `code` でエラー種別を判定できる。

```json
// AppException 系
{ "code": "VALIDATION_ERROR",     "message": "メールアドレスの形式が...", "traceId": "abc-123-..." }
{ "code": "CONFIGURATION_ERROR",  "message": "Internal Server Error",    "traceId": "abc-123-..." }
{ "code": "INTERNAL_ERROR",       "message": "Internal Server Error",    "traceId": "abc-123-..." }
{ "code": "PARSE_ERROR",          "message": "Invalid request body...",  "traceId": "abc-123-..." }
{ "code": "UNKNOWN_ERROR",        "message": "Internal Server Error",    "traceId": "abc-123-..." }

// DomainError 系（Priority 7 で導入済み）
{ "code": "USER_EMAIL_ALREADY_REGISTERED", "message": "...", "traceId": "abc-123-...", "payload": { "email": "..." } }
```

`expose = false` の例外（ConfigurationException, InternalException）はメッセージを `"Internal Server Error"` に置き換え、内部情報の漏洩を防ぐ。実際のメッセージはサーバー側ログにのみ記録する。

#### traceId の伝搬設計

traceId はクライアントが HTTP ヘッダーで送信する。未指定なら Lambda Authorizer が生成する。どちらの場合も Authorizer context に含まれて Lambda に届く（accessToken と同じ経路）。

```
Client (header) → Authorizer (context.traceId) → requestContextMiddleware → FunctionRequestContext.traceId
  → ログ出力（logApp / logInfo / logWarn / logError）
  → エラーレスポンス（appErrorHandler が traceId を付与）
```

traceId の注入は appErrorHandler ミドルウェアの1箇所に集約する。Lambda ハンドラは traceId を意識する必要がない。

#### httpErrorHandler → appErrorHandler 置き換え

middy の `httpErrorHandler` はレスポンスボディに `code` や `traceId` を含められない。`zodParseErrorHandler`（Zod の ParseError を 400 に変換していた自前ミドルウェア）の責務も含めて、単一の `appErrorHandler` に統合する。

#### DomainErrorException によるドメインエラーの統合

当初、Lambda ハンドラの `throwHttpError` が traceId を引数として要求する設計だった。しかし traceId は requestContext に既にあるため、ハンドラに traceId を意識させるのは冗長である。

そこで `DomainErrorException`（`AppException` の派生）を導入し、ドメインエラーも throw → appErrorHandler で処理する経路に統合した。これにより traceId 注入がミドルウェアの1箇所に集約され、ハンドラは `throwHttpError(domainError, statusMap)` を呼ぶだけで済む。`throwHttpError` の戻り値型は `never` であり、関数名の `throw` プレフィックスとあわせて副作用を明示する。

### 主な変更

#### AppException 階層（`src/domains/commons/exceptions.ts`）

```typescript
export abstract class AppException extends Error {
  abstract readonly code: string
  abstract readonly statusCode: number
  abstract readonly expose: boolean
  readonly context: Record<string, unknown>

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message)
    this.name = this.constructor.name
    this.context = context
  }
}

export class ValidationException extends AppException {
  readonly code = 'VALIDATION_ERROR' as const
  readonly statusCode = 400 as const
  readonly expose = true as const
}

export class ConfigurationException extends AppException { /* 500, expose=false */ }
export class InternalException extends AppException { /* 500, expose=false */ }
```

`context` はサーバー側ログ専用の構造化データ。`InternalException('NewUser not found', { userId: '123' })` のように、デバッグに必要な情報を渡す。クライアントには返さない。

#### DomainErrorException（`src/domains/commons/exceptions.ts`）

```typescript
export class DomainErrorException extends AppException {
  readonly code: string
  readonly statusCode: number
  readonly expose = true as const
  readonly domainError: DomainError

  constructor(domainError: DomainError, statusCode: number) {
    super(domainError.message)
    this.code = domainError.code
    this.statusCode = statusCode
    this.domainError = domainError
  }
}
```

`AppException` を継承するため `appErrorHandler` の既存ロジックで処理可能。`domainError` フィールドで payload にもアクセスでき、レスポンスボディに展開する。

#### traceId 伝搬経路

```
src/schemas/lambdaAuthorizerSchema.ts        — context に traceId を追加
src/domains/commons/IFunctionRequestContext.ts — traceId プロパティ追加
src/runtime/functionRequestContext.ts          — コンストラクタ + 全ログメソッドに traceId
src/runtime/mockFunctionRequestContext.ts      — traceId: 'mock-trace-id'
src/middleware/requestContext.ts                — authorizer context から traceId を抽出
```

#### 統合エラーハンドラ（`src/middleware/appErrorHandler.ts`）

```typescript
export const appErrorHandler = (logger: Logger): MiddlewareObj<unknown, APIGatewayProxyResult> => ({
  onError: async (request) => {
    const traceId = request.context.requestContext?.traceId ?? 'unknown'
    const body: Record<string, unknown> = { traceId }

    if (error.name === 'ParseError') {         // Zod バリデーション失敗 → 400
      body.code = 'PARSE_ERROR'
    } else if (error instanceof DomainErrorException) {  // ドメインエラー → payload 展開
      body.code = error.code
      if ('payload' in error.domainError) body.payload = error.domainError.payload
    } else if (error instanceof AppException) {          // 想定外エラー → expose で公開判定
      body.code = error.code
      body.message = error.expose ? error.message : 'Internal Server Error'
    } else {                                             // 未知のエラー → 500
      body.code = 'UNKNOWN_ERROR'
    }
    request.response = { statusCode, body: JSON.stringify(body) }
  },
})
```

`DomainErrorException` を `AppException` より先に判定する。両方 `instanceof AppException` に該当するが、ドメインエラーは payload の展開が必要なため専用の分岐を設けている。

#### throwHttpError（`src/lambda/commons/httpResponse.ts`）

```typescript
export function throwHttpError<E extends DomainError>(
  domainError: E,
  statusMap: DomainErrorStatusMap<E>,
): never {
  throw new DomainErrorException(domainError, statusMap[domainError.code as E['code']])
}
```

旧名 `httpDomainError` から `throwHttpError` にリネーム。`httpValue`（値を返す）との対比で、シグネチャの違い（`T` vs `never`）を関数名で表現する。

#### 既存 throw サイトの移行

| ファイル | 変更前 | 変更後 |
|---------|--------|--------|
| `StringValueObject.ts`, `email.ts`, `userId.ts`, `organizationId.ts` | `throw new Error(...)` | `throw new ValidationException(...)` |
| `requestContext.ts`, `functionRequestContext.ts` | `throw new Error(...)` | `throw new ConfigurationException(...)` |
| `createUser.ts`, `keycloakUserRepository.ts`, `postgresqlUserQueryRepository.ts` | `throw new Error(...)` | `throw new InternalException(...)` |
| `DomainResult.ts` の `assertNever` | `throw new Error(...)` | `throw new InternalException(...)` |

#### 削除

- `src/middleware/zodParseErrorHandler.ts` — appErrorHandler に統合
- `http-errors` / `@types/http-errors` / `@middy/http-error-handler` — パッケージ削除

### 変更対象ファイル

```
src/
├── domains/commons/
│   ├── exceptions.ts                    [新規] AppException 階層 + DomainErrorException
│   ├── exceptions.test.ts              [新規] 例外クラスの基本検証
│   ├── DomainResult.ts                  assertNever → InternalException
│   ├── IFunctionRequestContext.ts       traceId プロパティ追加
│   └── StringValueObject.ts            throw → ValidationException
├── domains/user/valueObjects/
│   ├── email.ts                         throw → ValidationException
│   └── userId.ts                        throw → ValidationException
├── domains/organization/valueObjects/
│   └── organizationId.ts               throw → ValidationException
├── functions/userLogic/
│   └── createUser.ts                    throw → InternalException（context 付き）
├── infrastructures/
│   ├── keycloak/keycloakUserRepository.ts    throw → InternalException
│   └── postgresql/postgresqlUserQueryRepository.ts  同上
├── lambda/
│   ├── commons/httpResponse.ts          throwHttpError（DomainErrorException を throw）
│   ├── commons/testEventTemplate.ts     traceId 追加
│   ├── createUser/index.ts              throwHttpError 呼び出し（return 不要）
│   ├── createUser/index.test.ts         traceId 追加
│   ├── queryUsers/index.ts              同上
│   └── queryUsers/index.test.ts         同上
├── middleware/
│   ├── appErrorHandler.ts              [新規] 統合エラーハンドラ
│   ├── appErrorHandler.test.ts         [新規] エラー種別ごとのレスポンス検証
│   ├── commonMiddleware.ts              appErrorHandler に置き換え
│   ├── requestContext.ts                traceId 抽出 + ConfigurationException + ログ強化
│   └── zodParseErrorHandler.ts         [削除] appErrorHandler に統合
├── runtime/
│   ├── functionRequestContext.ts         traceId フィールド + 全ログに traceId
│   └── mockFunctionRequestContext.ts    traceId: 'mock-trace-id'
└── schemas/
    └── lambdaAuthorizerSchema.ts        context に traceId 追加
```

### 効果

- **エラー種別の構造化**: 全 throw サイトが3種の例外クラスに分類され、`code` / `statusCode` / `expose` が型レベルで固定される。`throw new Error('...')` のような非構造化エラーが排除された
- **エラーレスポンスの統一**: ドメインエラー・想定外エラー・パースエラー・未知のエラーすべてが `{ code, message, traceId, payload? }` 形式で返る。クライアントは常に `code` フィールドでエラー種別を判定できる
- **traceId による運用支援**: 全エラーレスポンスに traceId を含めることで、クライアントからの問い合わせ時にログを特定できる。全ログ出力にも traceId が含まれるため、リクエスト単位でのログ追跡が可能
- **traceId 注入の集約**: traceId は appErrorHandler ミドルウェアの1箇所で注入される。Lambda ハンドラは traceId を意識する必要がなく、`throwHttpError(domainError, statusMap)` を呼ぶだけでよい
- **情報漏洩の防止**: `expose = false` の例外はメッセージを `"Internal Server Error"` に置き換え。実際のメッセージ（構成情報や内部状態）はサーバー側ログにのみ記録される
- **ミドルウェアの統合**: `httpErrorHandler` + `zodParseErrorHandler` を `appErrorHandler` に統合し、エラー処理の分散を解消。`http-errors` パッケージへの依存も除去

## テスト結果

全18ファイル・76テストがパス。各 Priority 実装後にテスト全パス・TypeScript 型チェック通過を確認済み。
