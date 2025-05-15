import { v4 as uuidv4 } from 'uuid'
import { Organization } from './organization.js'
import { OrganizationId } from './valueObjects/organizationId.js'
import { OrganizationName } from './valueObjects/organizationName.js'
import { OrganizationDisplayName } from './valueObjects/organizationDisplayName.js'

describe('Organization', () => {
  it('should create an organization with valid id, name, and displayName', () => {
    const id = new OrganizationId(uuidv4())
    const name = new OrganizationName('Test Organization')
    const displayName = new OrganizationDisplayName('Test Org')

    const organization = new Organization(id, name, displayName)

    expect(organization.id).toBe(id)
    expect(organization.name).toBe(name)
    expect(organization.displayName).toBe(displayName)
  })
})
