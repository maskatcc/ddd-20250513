---
description: ドメイン層（値オブジェクト・エンティティ・リポジトリ）の実装規約
paths: ['src/domains/**']
---

## 値オブジェクト

- 基底クラスは `ImmutableValueObject<T>` を継承する
- 文字列値は `StringValueObject`（`ImmutableValueObject<string>` の派生）を継承する
  - 必須チェックは `RequiredSpec` を、長さチェックは `LengthSpec` を実装する
  - バリデーション失敗は constructor で `throw new Error()` する
  - パース試行は `static tryParse()` を使う（失敗時は `undefined` を返す）

## エンティティ

- プロパティはすべて `public readonly`
- 同一性は `equals()` メソッドでIDを比較して判定する
- 永続化からの復元は `static reconstruct()` を使う（バリデーション省略・データ補正の拡張ポイント）
- 新規作成は `new` またはcreateファクトリを使う

## ドメインエラー・DomainResult

- エラー型は `DomainError<Code, Payload>` の型エイリアスとして `domains/commons/errors.ts` に宣言する
- `Code` は `SCREAMING_SNAKE_CASE` の文字列リテラル型にする
- `Payload` はエラーに文脈情報が必要なときだけ指定する
- 成功は `succeed(value)`、失敗は `fail(domainError)` で返す
- ドメイン関数の戻り値は `DomainResult<T, E>` にする
- 予期しないエラーコードは `assertNever()` で網羅チェックする

## リポジトリインターフェース

- `domains/[aggregate]/repositories/` に配置する
- インターフェースのみ定義する（実装は `infrastructures/` に置く）
- ユースケース内での責務ごとにインターフェースを分割する（インターフェース分離の原則）
