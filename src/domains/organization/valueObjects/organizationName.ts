import { LengthSpec, RequiredSpec, StringValueObject } from '../../commons/StringValueObject.js'

export class OrganizationName extends StringValueObject implements RequiredSpec, LengthSpec {
  public isRequired(): boolean { return true }
  public maxLength(): number { return 20 }
}
