import { LengthSpec, RequiredSpec, StringValueObject } from '../../commons/StringValueObject.js'
import { ValidationException } from '../../commons/exceptions.js'

export class Email extends StringValueObject implements RequiredSpec, LengthSpec {
  private static readonly regex = new RegExp('^.+@.+$')

  public isRequired(): boolean { return true }
  public maxLength(): number { return 128 }

  constructor(value: string) {
    super(value)

    if (Email.regex.test(value) === false) {
      throw new ValidationException(`メールアドレスの形式が正しくありません。`)
    }
  }
}
