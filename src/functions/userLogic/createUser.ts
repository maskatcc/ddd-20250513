import { Email, User, UserId, UserName } from '../../domains/user/user.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserRepository, IUserOrganizationRepository, IUserNotificationRepository } from '../../domains/user/repositories/index.js'

export type CreateUserDeps = {
  userRepository: IUserRepository
  userOrganizationRepository: IUserOrganizationRepository
  userNotificationRepository: IUserNotificationRepository
}

export async function createUser(args: { organizationId: OrganizationId, email: Email, userName: UserName }, deps: CreateUserDeps): Promise<UserId> {
  let targetUser: User

  // ユーザーアカウントを作成する（冪等にする）
  const savedUser = await deps.userRepository.findByEmail(args.email)
  const isNewAccount = !savedUser

  if (isNewAccount) {
    const newUserId = await deps.userRepository.create(args.userName, args.email)
    const newUser = await deps.userRepository.findById(newUserId)
    if (!newUser) {
      throw new Error('NewUser not found.')
    }
    targetUser = newUser
  }
  else {
    targetUser = savedUser
  }

  // ユーザーを組織に所属させる（冪等にする）
  await deps.userOrganizationRepository.joinOrganization(targetUser.id, args.organizationId)

  // 招待メールを送信する
  if (isNewAccount) {
    // アカウント設定リクエストを送信する
    await deps.userNotificationRepository.invite(targetUser.id, args.organizationId)
  }
  else {
    // メールアドレス確認リクエストを送信する
    await deps.userNotificationRepository.verifyEmail(targetUser.id)
  }

  return targetUser.id
}
