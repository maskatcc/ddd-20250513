import { UserName } from './userName.js'

describe('userName', () => {
  it('不変のValueObject', () => {
    const o = new UserName('山田太郎')
    expect(o.value).toBe('山田太郎')
  })

  it('入力値の評価', () => {
    const userName = UserName.tryParse('佐藤花子')
    expect(userName !== undefined).toBe(true)
    expect(userName).toEqual(new UserName('佐藤花子'))
  })

  it('値は必須', () => {
    expect(() => new UserName('')).toThrow()
    expect(UserName.tryParse('') === undefined).toBe(true)
  })

  it('長さは50文字以内', () => {
    expect(() => new UserName('123456789012345678901234567890123456789012345678901')).toThrow()
    expect(UserName.tryParse('123456789012345678901234567890123456789012345678901') === undefined).toBe(true)
  })
})
