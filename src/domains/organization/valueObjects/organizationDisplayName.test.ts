import { OrganizationDisplayName } from './organizationDisplayName.js'

describe('OrganizationDisplayName', () => {
  it('should be required', () => {
    const displayName = new OrganizationDisplayName('Test Organization')
    expect(displayName.isRequired()).toBe(true)
  })

  it('should have a maximum length of 50', () => {
    const displayName = new OrganizationDisplayName('Test Organization')
    expect(displayName.maxLength()).toBe(50)
  })

  it('should create a valid OrganizationDisplayName', () => {
    const displayName = new OrganizationDisplayName('Valid Organization Name')
    expect(displayName.value).toBe('Valid Organization Name')
  })

  it('should throw an error if the name is empty', () => {
    expect(() => new OrganizationDisplayName('')).toThrow()
  })

  it('should throw an error if the name exceeds the maximum length', () => {
    expect(() => new OrganizationDisplayName('A'.repeat(51))).toThrow()
  })
})
