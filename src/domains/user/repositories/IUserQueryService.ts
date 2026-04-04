import { OrganizationId } from '../../organization/valueObjects/organizationId.js'

/** ユーザー問い合わせ結果 */
export type UserQueryResult = {
  userId: string
  userName: string
  email: string
}

/** ユーザー問い合わせ用クエリサービスインターフェース */
export interface IUserQueryService {
  query(orgId: OrganizationId): Promise<UserQueryResult[]>
}
