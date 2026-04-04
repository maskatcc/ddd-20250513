import { User } from '../user.js'
import { Email } from '../valueObjects/email.js'
import { UserId } from '../valueObjects/userId.js'
import { UserName } from '../valueObjects/userName.js'

/** ユーザーの永続化・取得に関するリポジトリインターフェース */
export interface IUserRepository {
  create(name: UserName, email: Email): Promise<UserId>
  findById(id: UserId): Promise<User | undefined>
  findByEmail(email: Email): Promise<User | undefined>
}
