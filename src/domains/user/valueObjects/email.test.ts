import { Email } from './email.js'

describe('Email', () => {
  it('不変のValueObject', () => {
    const o = new Email('tanaka@sample.com')
    expect(o.value).toBe('tanaka@sample.com')
  })

  it('入力値の評価', () => {
    const email = Email.tryParse('saito@company.com')
    expect(email !== undefined).toBe(true)
    expect(email).toEqual(new Email('saito@company.com'))
  })

  it('値は必須', () => {
    expect(() => new Email('')).toThrow()
    expect(Email.tryParse('') === undefined).toBe(true)
  })

  it('長さは128文字以内', () => {
    const test = `
            1xxxxxxxxx
            2xxxxxxxxx
            3xxxxxxxxx
            4xxxxxxxxx
            5xxxxxxxxx
            6xxxxxxxxx
            7xxxxxxxxx
            8xxxxxxxxx
            9xxxxxxxxx
            10xxxxxxxx
            11xxxxxxxx
            12xxxxxxxx
            13xxxxxxxx` // 130文字
    expect(() => new Email(test)).toThrow()
    expect(Email.tryParse(test) === undefined).toBe(true)
  })

  it('メールアドレス形式（name@domain）が必要', () => {
    expect(() => new Email('abc')).toThrow()
    expect(Email.tryParse('abc') === undefined).toBe(true)
  })
})
