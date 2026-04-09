import { expectTypeOf } from 'expect-type'
import type { DomainError, DomainResult } from './DomainResult.js'
import type { DomainErrorStatusMap } from '../../lambda/commons/httpResponse.js'

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
    expectTypeOf<{ A: 400, B: 404 }>().toExtend<DomainErrorStatusMap<E>>()
    // @ts-expect-error — B 欠落でコンパイルエラー
    const _bad: DomainErrorStatusMap<E> = { A: 400 }
  })

  it('never の場合は空オブジェクトで通る', () => {
    expectTypeOf<Record<string, never>>().toExtend<DomainErrorStatusMap<never>>()
  })
})

describe('DomainResult 伝搬', () => {
  it('下位のエラー結果が上位の union に代入できる', () => {
    type Sub = DomainError<'A'>
    type Super = DomainError<'A'> | DomainError<'B'>
    expectTypeOf<DomainResult<number, Sub>>().toExtend<DomainResult<number, Super>>()
  })
})
