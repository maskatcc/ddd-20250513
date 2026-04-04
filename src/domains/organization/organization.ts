import { OrganizationDisplayName } from './valueObjects/organizationDisplayName.js'
import { OrganizationId } from './valueObjects/organizationId.js'
import { OrganizationName } from './valueObjects/organizationName.js'

export class Organization {
  constructor(
    public readonly id: OrganizationId,
    public readonly name: OrganizationName,
    public readonly displayName: OrganizationDisplayName,
  ) {}

  equals(other: Organization): boolean {
    return this.id.equals(other.id)
  }

  static reconstruct(id: OrganizationId, name: OrganizationName, displayName: OrganizationDisplayName): Organization {
    return new Organization(id, name, displayName)
  }
}

export {
  OrganizationId,
  OrganizationName,
  OrganizationDisplayName,
}
