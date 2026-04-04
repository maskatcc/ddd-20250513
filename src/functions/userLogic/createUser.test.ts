import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, User, UserId, UserName } from '../../domains/user/user.js'
import { UserCreateRepository } from '../../infrastructures/keycloak/userCreateRepository.js'
import { KeycloakUserNotificationRepository } from '../../infrastructures/keycloak/keycloakUserNotificationRepository.js'
import { KeycloakUserOrganizationRepository } from '../../infrastructures/keycloak/keycloakUserOrganizationRepository.js'
import { UserFindRepository } from '../../infrastructures/keycloak/userFindRepository.js'
import { createFunctionContext } from '../../runtime/functionContext.js'
import { createUser } from './createUser.js'
import { v4 as uuidv4 } from 'uuid'

describe('createUser', () => {
  const context = createFunctionContext()
  const organizationId = new OrganizationId(uuidv4())
  const email = new Email('taro@company.net')
  const userName = new UserName('Taro')
  const userId = new UserId(uuidv4())

  test('ユーザーを作成してアカウント設定リクエストを送信する', async () => {
    const createdUser = new User(userId, userName, email)

    // arrange
    const findByEmailSpy = vi.spyOn(UserFindRepository.prototype, 'findByEmail').mockResolvedValue(undefined)
    const createSpy = vi.spyOn(UserCreateRepository.prototype, 'create').mockResolvedValue(userId)
    const findByIdSpy = vi.spyOn(UserFindRepository.prototype, 'findById').mockResolvedValue(createdUser)
    const joinOrganizationSpy = vi.spyOn(KeycloakUserOrganizationRepository.prototype, 'joinOrganization').mockResolvedValue(undefined)
    const inviteSpy = vi.spyOn(KeycloakUserNotificationRepository.prototype, 'invite').mockResolvedValue(undefined)
    const verifyEmailSpy = vi.spyOn(KeycloakUserNotificationRepository.prototype, 'verifyEmail').mockResolvedValue(undefined)

    // act
    const result = await createUser({ organizationId, email, userName }, context)

    // assert
    expect(result).toEqual(userId)
    expect(findByEmailSpy).toHaveBeenCalledWith(email)
    expect(createSpy).toHaveBeenCalledWith(userName, email)
    expect(findByIdSpy).toHaveBeenCalledWith(userId)
    expect(joinOrganizationSpy).toHaveBeenCalledWith(userId, organizationId)
    expect(inviteSpy).toHaveBeenCalledWith(userId, organizationId)
    expect(verifyEmailSpy).not.toHaveBeenCalled()
  })

  test('ユーザーを作成してメールアドレス確認リクエストを送信する', async () => {
    const savedUser = new User(userId, userName, email)

    // arrange
    const findByEmailSpy = vi.spyOn(UserFindRepository.prototype, 'findByEmail').mockResolvedValue(savedUser)
    const joinOrganizationSpy = vi.spyOn(KeycloakUserOrganizationRepository.prototype, 'joinOrganization').mockResolvedValue(undefined)
    const verifyEmailSpy = vi.spyOn(KeycloakUserNotificationRepository.prototype, 'verifyEmail').mockResolvedValue(undefined)

    // act
    const result = await createUser({ organizationId, email, userName }, context)

    // assert
    expect(result).toEqual(userId)
    expect(findByEmailSpy).toHaveBeenCalledWith(email)
    expect(joinOrganizationSpy).toHaveBeenCalledWith(userId, organizationId)
    expect(verifyEmailSpy).toHaveBeenCalledWith(userId)
  })

  test.fails('作成したユーザーが取得できない想定外エラー', async () => {
    // arrange
    vi.spyOn(UserFindRepository.prototype, 'findByEmail').mockResolvedValue(undefined)
    vi.spyOn(UserCreateRepository.prototype, 'create').mockResolvedValue(userId)
    vi.spyOn(UserFindRepository.prototype, 'findById').mockResolvedValue(undefined)

    // act
    await createUser({ organizationId, email, userName }, context)
  })
})
