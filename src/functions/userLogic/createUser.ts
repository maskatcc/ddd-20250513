import { Email, User, UserId, UserName } from '../../domains/user/user.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { IUserRepository, IUserOrganizationRepository, IUserNotificationRepository } from '../../domains/user/repositories/index.js'
import { IFunctionRequestContext } from '../../domains/commons/IFunctionRequestContext.js'
import { DomainResult, succeed } from '../../domains/commons/DomainResult.js'
import { InternalException } from '../../domains/commons/exceptions.js'

export type CreateUserDeps = {
  userRepository: IUserRepository
  userOrganizationRepository: IUserOrganizationRepository
  userNotificationRepository: IUserNotificationRepository
}

export type CreateUserDepsFactory = (context: IFunctionRequestContext) => CreateUserDeps

export type CreateUserInput = {
  organizationId: OrganizationId
  email: Email
  userName: UserName
}

export function createUser(depsFactory: CreateUserDepsFactory) {
  return async (context: IFunctionRequestContext, input: CreateUserInput): Promise<DomainResult<UserId, never>> => {
    const { userRepository, userOrganizationRepository, userNotificationRepository } = depsFactory(context)

    let targetUser: User

    // ユーザーアカウントを作成する（冪等にする）
    const savedUser = await userRepository.findByEmail(input.email)
    const isNewAccount = !savedUser

    if (isNewAccount) {
      const newUserId = await userRepository.create(input.userName, input.email)
      const newUser = await userRepository.findById(newUserId)
      if (!newUser) {
        throw new InternalException('NewUser not found after creation', { email: input.email.value })
      }
      targetUser = newUser
    }
    else {
      targetUser = savedUser
    }

    // ユーザーを組織に所属させる（冪等にする）
    await userOrganizationRepository.joinOrganization(targetUser.id, input.organizationId)

    // 招待メールを送信する
    if (isNewAccount) {
      // アカウント設定リクエストを送信する
      await userNotificationRepository.invite(targetUser.id, input.organizationId)
    }
    else {
      // メールアドレス確認リクエストを送信する
      await userNotificationRepository.verifyEmail(targetUser.id)
    }

    return succeed(targetUser.id)
  }
}
