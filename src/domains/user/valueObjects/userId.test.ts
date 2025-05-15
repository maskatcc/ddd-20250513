import { UserId } from './userId.js'
import { v4 as uuidv4 } from 'uuid'

describe('userId', () => {
  it('不変のValueObject', () => {
    const value = uuidv4()
    const userId = new UserId(value)
    expect(userId.value).toBe(value)
  })

  it('値は必須', () => {
    expect(new UserId(uuidv4()).isRequired()).toBe(true)
    expect(() => new UserId('')).toThrow()
  })

  it('値はuuid形式', () => {
    expect(() => new UserId('1')).toThrow()
    expect(() => new UserId(uuidv4().replace('-', '+'))).toThrow()
  })
})
