import { OrganizationName } from './organizationName.js'

describe('OrganizationName', () => {
  it('should be required', () => {
    const organizationName = new OrganizationName('Test Organization')
    expect(organizationName.isRequired()).toBe(true)
  })

  it('should have a maximum length of 20', () => {
    const organizationName = new OrganizationName('Test Organization')
    expect(organizationName.maxLength()).toBe(20)
  })

  it('should create a valid OrganizationName', () => {
    const validName = 'Valid Organization'
    const organizationName = new OrganizationName(validName)
    expect(organizationName.value).toBe(validName)
  })

  it('should throw an error if the name is empty', () => {
    expect(() => new OrganizationName('')).toThrow()
  })

  it('should throw an error if the name exceeds the maximum length', () => {
    const longName = 'This name is definitely too long for the limit'
    expect(() => new OrganizationName(longName)).toThrow()
  })
})
