import { OrganizationId } from '../../organization/valueObjects/organizationId.js'
import { UserId } from '../valueObjects/userId.js'

/** ユーザーへの通知送信に関するリポジトリインターフェース */
export interface IUserNotificationRepository {
  invite(id: UserId, orgId: OrganizationId): Promise<void>
  verifyEmail(id: UserId): Promise<void>
}
