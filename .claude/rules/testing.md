---
description: テストの実装規約
paths: ['src/**/*.test.ts']
---

## 基本

- テストケースは `it()` を使う（`test()` は使わない）
- `describe` / `it` / `expect` / `vi` は import 不要（グローバル設定済み）
- テストファイルはテスト対象と同ディレクトリに `xxx.test.ts` として配置する
- テスト名は日本語で記述する
- テスト名は仕様を説明する表現にする（「〜できる」「〜と判定される」など）

## 未実装のテスト

- まだ実装されていないテストは `it.fails()` で記録する

## テストの構成

- arrange / act / assert の順で記述する
- 各フェーズはコメントまたは空行で区切る

## モック

- モジュール全体のモックは `vi.mock()` を使う
- 特定の関数のスパイは `vi.spyOn()` を使う

## Lambda テスト

- イベントは `testEventTemplate` をスプレッドで拡張して作成する
- Lambdaコンテキストは `mockContext()` を使う

## インフラテスト

- `IFunctionRequestContext` は `mockFunctionRequestContext` を使う
