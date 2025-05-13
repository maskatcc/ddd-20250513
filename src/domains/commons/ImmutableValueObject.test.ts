import { ImmutableValueObject } from './ImmutableValueObject.js'

describe('ImmutableValueObject', () => {
  it('string型引数を扱える', () => {
    const o = new ImmutableValueObject('')
    expect(typeof o.value === 'string').toBeTruthy()
  })

  it('integer型引数を扱える', () => {
    const o = new ImmutableValueObject(0)
    expect(typeof o.value === 'number').toBeTruthy()
  })

  it('valueのみを持つ', () => {
    const o1 = new ImmutableValueObject('test')
    const o2 = new ImmutableValueObject('test')
    expect(o1).toEqual(o2)
    expect(o1.value).toBe(o2.value)
  })

  it('valueは読み取り専用', () => {
    // コンパイルチェックされるので通常の手段で実装できない
    // const o = new ImmutableValueObject(0);
    // o.value = 1;
  })

  it('equalsで一致判定する', () => {
    const o1 = new ImmutableValueObject('test')
    const o2 = new ImmutableValueObject('test')
    expect(o1).not.toBe(o2)
    expect(o1.equals(o1)).toBeTruthy()
    expect(o1.equals(o2)).toBeTruthy()
  })

  it('nullやundefinedとは常に一致しない', () => {
    const o1 = new ImmutableValueObject('test')
    expect(o1.equals(null as unknown as ImmutableValueObject<string>)).toBeFalsy()
    expect(o1.equals(undefined as unknown as ImmutableValueObject<string>)).toBeFalsy()
  })
})
