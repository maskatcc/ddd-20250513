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

  it('同一IDのエンティティは等価と判定される', () => {
    const id = new OrganizationId(uuidv4())
    const org1 = new Organization(id, new OrganizationName('Org A'), new OrganizationDisplayName('A'))
    const org2 = new Organization(id, new OrganizationName('Org B'), new OrganizationDisplayName('B'))
    expect(org1.equals(org2)).toBe(true)
  })

  it('異なるIDのエンティティは等価でないと判定される', () => {
    const org1 = new Organization(new OrganizationId(uuidv4()), new OrganizationName('Org'), new OrganizationDisplayName('O'))
    const org2 = new Organization(new OrganizationId(uuidv4()), new OrganizationName('Org'), new OrganizationDisplayName('O'))
    expect(org1.equals(org2)).toBe(false)
  })

  it('reconstructで永続化から復元できる', () => {
    const id = new OrganizationId(uuidv4())
    const name = new OrganizationName('Test Organization')
    const displayName = new OrganizationDisplayName('Test Org')
    const org = Organization.reconstruct(id, name, displayName)
    expect(org.id).toEqual(id)
    expect(org.name).toEqual(name)
    expect(org.displayName).toEqual(displayName)
  })
})
