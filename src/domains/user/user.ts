import { Email } from './valueObjects/email.js'
import { UserId } from './valueObjects/userId.js'
import { UserName } from './valueObjects/userName.js'

export class User {
  constructor(
    public readonly id: UserId,
    public readonly name: UserName,
    public readonly email: Email,
  ) {}

  equals(other: User): boolean {
    return this.id.equals(other.id)
  }

  static reconstruct(id: UserId, name: UserName, email: Email): User {
    return new User(id, name, email)
  }
}

export {
  UserId,
  UserName,
  Email,
}
