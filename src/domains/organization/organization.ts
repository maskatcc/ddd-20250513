import { OrganizationDisplayName } from './valueObjects/organizationDisplayName.js'
import { OrganizationId } from './valueObjects/organizationId.js'
import { OrganizationName } from './valueObjects/organizationName.js'

export class Organization {
  constructor(
    public id: OrganizationId,
    public name: OrganizationName,
    public displayName: OrganizationDisplayName,
  ) {}
}

export {
  OrganizationId,
  OrganizationName,
  OrganizationDisplayName,
}
