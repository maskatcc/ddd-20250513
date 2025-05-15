import { LengthSpec, RequiredSpec, StringValueObject } from '../../commons/StringValueObject.js'

export class OrganizationDisplayName extends StringValueObject implements RequiredSpec, LengthSpec {
  public isRequired(): boolean { return true }
  public maxLength(): number { return 50 }
}
