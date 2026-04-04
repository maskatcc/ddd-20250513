import { FunctionContext } from '../../runtime/functionContext.js'
import { Email, User, UserId, UserName } from '../../domains/user/user.js'
import { OrganizationId } from '../../domains/organization/organization.js'
import { UserFindRepository } from '../../infrastructures/keycloak/userFindRepository.js'
import { UserCreateRepository } from '../../infrastructures/keycloak/userCreateRepository.js'
import { KeycloakUserOrganizationRepository } from '../../infrastructures/keycloak/keycloakUserOrganizationRepository.js'
import { KeycloakUserNotificationRepository } from '../../infrastructures/keycloak/keycloakUserNotificationRepository.js'

export async function createUser(args: { organizationId: OrganizationId, email: Email, userName: UserName }, context: FunctionContext): Promise<UserId> {
  let targetUser: User

  // ユーザーアカウントを作成する（冪等にする）
  const userFindRepository = new UserFindRepository(context)
  const savedUser = await userFindRepository.findByEmail(args.email)
  const isNewAccount = !savedUser

  if (isNewAccount) {
    const newUserId = await new UserCreateRepository(context).create(args.userName, args.email)
    const newUser = await userFindRepository.findById(newUserId)
    if (!newUser) {
      throw new Error('NewUser not found.')
    }
    targetUser = newUser
  }
  else {
    targetUser = savedUser
  }

  // ユーザーを組織に所属させる（冪等にする）
  await new KeycloakUserOrganizationRepository(context).joinOrganization(targetUser.id, args.organizationId)

  // 招待メールを送信する
  const userEmailRepository = new KeycloakUserNotificationRepository(context)

  if (isNewAccount) {
    // アカウント設定リクエストを送信する
    await userEmailRepository.invite(targetUser.id, args.organizationId)
  }
  else {
    // メールアドレス確認リクエストを送信する
    await userEmailRepository.verifyEmail(targetUser.id)
  }

  return targetUser.id
}
