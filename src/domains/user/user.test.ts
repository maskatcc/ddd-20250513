import { User } from './user.js'
import { Email } from './valueObjects/email.js'
import { UserId } from './valueObjects/userId.js'
import { UserName } from './valueObjects/userName.js'
import { v4 as uuidv4 } from 'uuid'

describe('User', () => {
  it('必須項目を指定してオブジェクトを作成する', () => {
    const idValue = uuidv4()
    const nameValue = 'Taro'
    const emailValue = 'taro@sample.com'
    const user = new User(new UserId(idValue), new UserName(nameValue), new Email(emailValue))
    expect(user.id).toEqual(new UserId(idValue))
    expect(user.name).toEqual(new UserName(nameValue))
    expect(user.email).toEqual(new Email(emailValue))
  })

  it('同一IDのエンティティは等価と判定される', () => {
    const id = new UserId(uuidv4())
    const user1 = new User(id, new UserName('Taro'), new Email('taro@sample.com'))
    const user2 = new User(id, new UserName('Jiro'), new Email('jiro@sample.com'))
    expect(user1.equals(user2)).toBe(true)
  })

  it('異なるIDのエンティティは等価でないと判定される', () => {
    const user1 = new User(new UserId(uuidv4()), new UserName('Taro'), new Email('taro@sample.com'))
    const user2 = new User(new UserId(uuidv4()), new UserName('Taro'), new Email('taro@sample.com'))
    expect(user1.equals(user2)).toBe(false)
  })

  it('reconstructで永続化から復元できる', () => {
    const id = new UserId(uuidv4())
    const name = new UserName('Taro')
    const email = new Email('taro@sample.com')
    const user = User.reconstruct(id, name, email)
    expect(user.id).toEqual(id)
    expect(user.name).toEqual(name)
    expect(user.email).toEqual(email)
  })
})
