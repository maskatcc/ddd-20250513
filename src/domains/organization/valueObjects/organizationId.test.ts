import { v4 as uuidv4 } from 'uuid'
import { OrganizationId } from './organizationId.js'

describe('organizationId', () => {
  it('should create a valid OrganizationId', () => {
    const value = uuidv4()
    const organizationId = new OrganizationId(value)
    expect(organizationId.value).toBe(value)
  })

  it('値は必須', () => {
    expect(new OrganizationId(uuidv4()).isRequired()).toBe(true)
    expect(() => new OrganizationId('')).toThrow()
  })

  it('値はuuid形式', () => {
    expect(() => new OrganizationId('1')).toThrow()
    expect(() => new OrganizationId(uuidv4().replace('-', '+'))).toThrow()
  })
})
