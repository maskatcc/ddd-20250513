import { Email } from './valueObjects/email.js'
import { UserId } from './valueObjects/userId.js'
import { UserName } from './valueObjects/userName.js'

export class User {
  constructor(
    public id: UserId,
    public name: UserName,
    public email: Email,
  ) {}
}

export {
  UserId,
  UserName,
  Email,
}
