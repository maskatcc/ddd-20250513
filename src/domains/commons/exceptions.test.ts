import { AppException, ValidationException, ConfigurationException, InternalException } from './exceptions.js'

describe('AppException hierarchy', () => {
  describe('ValidationException', () => {
    it('code=VALIDATION_ERROR, statusCode=400, expose=true', () => {
      const e = new ValidationException('bad email', { field: 'email' })

      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(AppException)
      expect(e).toBeInstanceOf(ValidationException)
      expect(e.code).toBe('VALIDATION_ERROR')
      expect(e.statusCode).toBe(400)
      expect(e.expose).toBe(true)
      expect(e.message).toBe('bad email')
      expect(e.name).toBe('ValidationException')
      expect(e.context).toEqual({ field: 'email' })
    })
  })

  describe('ConfigurationException', () => {
    it('code=CONFIGURATION_ERROR, statusCode=500, expose=false', () => {
      const e = new ConfigurationException('authorizer not configured')

      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(AppException)
      expect(e).toBeInstanceOf(ConfigurationException)
      expect(e.code).toBe('CONFIGURATION_ERROR')
      expect(e.statusCode).toBe(500)
      expect(e.expose).toBe(false)
      expect(e.message).toBe('authorizer not configured')
      expect(e.name).toBe('ConfigurationException')
    })
  })

  describe('InternalException', () => {
    it('code=INTERNAL_ERROR, statusCode=500, expose=false', () => {
      const e = new InternalException('NewUser not found', { userId: '123' })

      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(AppException)
      expect(e).toBeInstanceOf(InternalException)
      expect(e.code).toBe('INTERNAL_ERROR')
      expect(e.statusCode).toBe(500)
      expect(e.expose).toBe(false)
      expect(e.message).toBe('NewUser not found')
      expect(e.name).toBe('InternalException')
      expect(e.context).toEqual({ userId: '123' })
    })
  })

  describe('context のデフォルト', () => {
    it('未指定なら空オブジェクト', () => {
      const e = new ValidationException('error')

      expect(e.context).toEqual({})
    })
  })
})
