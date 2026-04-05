import { OrganizationId } from '../../domains/organization/organization.js'
import { Email, User, UserId, UserName } from '../../domains/user/user.js'
import { IUserRepository, IUserOrganizationRepository, IUserNotificationRepository } from '../../domains/user/repositories/index.js'
import { createUser, CreateUserDeps } from './createUser.js'
import { mockRequestContext } from '../../runtime/mockFunctionRequestContext.js'
import { v4 as uuidv4 } from 'uuid'

describe('createUser', () => {
  const organizationId = new OrganizationId(uuidv4())
  const email = new Email('taro@company.net')
  const userName = new UserName('Taro')
  const userId = new UserId(uuidv4())

  it('ユーザーを作成してアカウント設定リクエストを送信する', async () => {
    const createdUser = new User(userId, userName, email)

    // arrange
    const mockUserRepository: IUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(userId),
      findById: vi.fn().mockResolvedValue(createdUser),
    }
    const mockUserOrganizationRepository: IUserOrganizationRepository = {
      joinOrganization: vi.fn().mockResolvedValue(undefined),
    }
    const mockUserNotificationRepository: IUserNotificationRepository = {
      invite: vi.fn().mockResolvedValue(undefined),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
    }
    const deps: CreateUserDeps = {
      userRepository: mockUserRepository,
      userOrganizationRepository: mockUserOrganizationRepository,
      userNotificationRepository: mockUserNotificationRepository,
    }

    // act
    const result = await createUser(() => deps)(mockRequestContext, { organizationId, email, userName })

    // assert
    expect(result).toEqual(userId)
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email)
    expect(mockUserRepository.create).toHaveBeenCalledWith(userName, email)
    expect(mockUserRepository.findById).toHaveBeenCalledWith(userId)
    expect(mockUserOrganizationRepository.joinOrganization).toHaveBeenCalledWith(userId, organizationId)
    expect(mockUserNotificationRepository.invite).toHaveBeenCalledWith(userId, organizationId)
    expect(mockUserNotificationRepository.verifyEmail).not.toHaveBeenCalled()
  })

  it('ユーザーを作成してメールアドレス確認リクエストを送信する', async () => {
    const savedUser = new User(userId, userName, email)

    // arrange
    const mockUserRepository: IUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(savedUser),
      create: vi.fn(),
      findById: vi.fn(),
    }
    const mockUserOrganizationRepository: IUserOrganizationRepository = {
      joinOrganization: vi.fn().mockResolvedValue(undefined),
    }
    const mockUserNotificationRepository: IUserNotificationRepository = {
      invite: vi.fn(),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
    }
    const deps: CreateUserDeps = {
      userRepository: mockUserRepository,
      userOrganizationRepository: mockUserOrganizationRepository,
      userNotificationRepository: mockUserNotificationRepository,
    }

    // act
    const result = await createUser(() => deps)(mockRequestContext, { organizationId, email, userName })

    // assert
    expect(result).toEqual(userId)
    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email)
    expect(mockUserOrganizationRepository.joinOrganization).toHaveBeenCalledWith(userId, organizationId)
    expect(mockUserNotificationRepository.verifyEmail).toHaveBeenCalledWith(userId)
  })

  it.fails('作成したユーザーが取得できない想定外エラー', async () => {
    // arrange
    const mockUserRepository: IUserRepository = {
      findByEmail: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(userId),
      findById: vi.fn().mockResolvedValue(undefined),
    }
    const deps: CreateUserDeps = {
      userRepository: mockUserRepository,
      userOrganizationRepository: { joinOrganization: vi.fn() },
      userNotificationRepository: { invite: vi.fn(), verifyEmail: vi.fn() },
    }

    // act
    await createUser(() => deps)(mockRequestContext, { organizationId, email, userName })
  })
})
