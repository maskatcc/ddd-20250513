import { User } from './user.js'
import { Email } from './valueObjects/email.js'
import { UserId } from './valueObjects/userId.js'
import { UserName } from './valueObjects/userName.js'
import { v4 as uuidv4 } from 'uuid'

describe('User', () => {
  test('必須項目を指定してオブジェクトを作成する', () => {
    const idValue = uuidv4()
    const nameValue = 'Taro'
    const emailValue = 'taro@sample.com'
    const user = new User(new UserId(idValue), new UserName(nameValue), new Email(emailValue))
    expect(user.id).toEqual(new UserId(idValue))
    expect(user.name).toEqual(new UserName(nameValue))
    expect(user.email).toEqual(new Email(emailValue))
  })
})
