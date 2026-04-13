---
description: インフラ層（リポジトリ実装・Gateway）の実装規約
paths: ['src/infrastructures/**', 'src/runtime/**']
---

## ディレクトリ構成

- リポジトリ実装は `infrastructures/[外部サービス名]/` に配置する
- Gateway と Config は `runtime/` に配置する

## リポジトリ実装

- ドメイン層のリポジトリインターフェースを `implements` する
- クラスは凝集度が高くなるように複数のインターフェースを実装する
- constructor で `Gateway` と `IFunctionRequestContext` を `private readonly` で受け取る
- 永続化データからエンティティを復元する場合は `static reconstruct()` を使う
- 戻り値はユースケース層と同様に `DomainResult<T, E>` にする
- 外部サービスの業務エラーは `DomainError` に変換する。想定外のシステムエラーは `InternalException` に変換する（→ [error-handling](error-handling.md)）
- リポジトリ固有の型は他のリポジトリと共有せずインフラ層に閉じ込める

## Gateway

- 外部サービスのクライアントをラップするクラスとして定義する
- 接続設定は `XxxConfig` クラスとして分離し、同ファイルで export する
- `refresh()` メソッドを持ち、トークンリフレッシュや接続ヘルスチェックの拡張ポイントとする
