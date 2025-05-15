import { StringValueObject, RequiredSpec, LengthSpec } from './StringValueObject.js'

describe('StringValueObject', () => {
  it('should create a valid StringValueObject', () => {
    const value = 'test'
    expect(() => new StringValueObject(value)).not.toThrow()
  })

  it('should throw an error if value is not a string', () => {
    expect(() => new StringValueObject(123 as unknown as string)).toThrow('123 は文字列型でなければいけません。')
  })

  it('should return the correct value', () => {
    const value = 'test'
    const stringValueObject = new TestStringValueObject(value)
    expect(stringValueObject.value).toBe(value)
  })

  it('should compare two StringValueObjects correctly', () => {
    const value1 = 'test1'
    const value2 = 'test2'
    const stringValueObject1 = new StringValueObject(value1)
    const stringValueObject2 = new StringValueObject(value2)
    const stringValueObject3 = new StringValueObject(value1)

    expect(stringValueObject1.equals(stringValueObject2)).toBe(false)
    expect(stringValueObject1.equals(stringValueObject3)).toBe(true)
  })

  it('should return the correct string', () => {
    const value = 'test'
    const result = StringValueObject.tryParse(value)
    expect(result !== undefined).toBe(true)
    expect(result?.value).toBe(value)
  })
})

class TestStringValueObject extends StringValueObject implements RequiredSpec, LengthSpec {
  public isRequired(): boolean { return true }
  public maxLength(): number { return 10 }
}

describe('TestStringValueObject', () => {
  it('should create a valid TestStringValueObject', () => {
    const value = 'test'
    expect(() => new TestStringValueObject(value)).not.toThrow()
  })

  it('should throw an error if value is empty', () => {
    expect(() => new TestStringValueObject('')).toThrow('TestStringValueObject は必須値で空文字にできません。')
  })

  it('should throw an error if value is too long', () => {
    expect(() => new TestStringValueObject('12345678901')).toThrow('TestStringValueObject は最大長 10 を超えています。')
  })

  it('should return the correct string', () => {
    const value = 'test'
    const result = TestStringValueObject.tryParse(value)
    expect(result !== undefined).toBe(true)
    expect(result?.value).toBe(value)
  })

  it('should return invalid if value is empty', () => {
    const result = TestStringValueObject.tryParse('')
    expect(result === undefined).toBe(true)
  })

  it('should return invalid if value is too long', () => {
    const result = TestStringValueObject.tryParse('12345678901')
    expect(result === undefined).toBe(true)
  })
})
