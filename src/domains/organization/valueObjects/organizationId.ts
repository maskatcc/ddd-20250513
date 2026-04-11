import { StringValueObject, RequiredSpec } from '../../commons/StringValueObject.js'
import { ValidationException } from '../../commons/exceptions.js'
import { v4 as uuidv4 } from 'uuid'

export class OrganizationId extends StringValueObject implements RequiredSpec {
  private static regex = new RegExp('^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$')

  public isRequired(): boolean { return true }

  constructor(value: string) {
    super(value)

    const uuid = uuidv4()
    if (uuid.length !== value.length) {
      throw new ValidationException(`${this.constructor.name} の長さは ${uuid.length} 文字です。`)
    }
    if (OrganizationId.regex.test(value) === false) {
      throw new ValidationException(`${this.constructor.name}  の形式が正しくありません。`)
    }
  }
}
