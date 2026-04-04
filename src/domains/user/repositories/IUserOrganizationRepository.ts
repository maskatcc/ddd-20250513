import { OrganizationId } from '../../organization/valueObjects/organizationId.js'
import { UserId } from '../valueObjects/userId.js'

/** ユーザーの組織所属に関するリポジトリインターフェース */
export interface IUserOrganizationRepository {
  joinOrganization(id: UserId, orgId: OrganizationId): Promise<void>
}
