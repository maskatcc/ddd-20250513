---
description: ユースケース層（functions）の実装規約
paths: ['src/functions/**']
---

## 依存性の受け取り方

- インフラ層の依存オブジェクトは `DepsFactory` パターンで受け取る
- `(context: IFunctionRequestContext) => Deps` の形で注入する
- Deps の型は `XxxDeps` として明示的に定義する

## 関数シグネチャ

- `depsFactory` を引数に取り、非同期関数を返す高階関数にする
- ユースケースへの入力は値オブジェクトで構成した `XxxInput` 型として明示的に定義する

## 抽象度の統一

- ユースケースのエントリポイントとなる関数はオーケストレーションに専念する
- ひとつの関数内で操作の抽象度を揃える。段階的な具体化は関数分割で表現する
- 「何をするか」を記述する。実装の詳細（どうやるか）はインフラ層に委ねる

## DomainResult の扱い

- 関数内で扱うエラー型を `type XxxError = ErrorA | ErrorB` の形で宣言する
- 戻り値は `Promise<DomainResult<T, E>>` にする
- 成功は `succeed(value)`、失敗は `fail(domainError)` で返す
- ドメインエラーを分岐処理するときは `switch` で網羅し、default で `assertNever()` を呼ぶ
- 例外（throw）はシステムエラー（予期しない失敗）のみに使う。ドメインの失敗は `fail()` で返す
