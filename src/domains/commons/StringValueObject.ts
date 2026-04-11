import { ImmutableValueObject } from './ImmutableValueObject.js'
import { ValidationException } from './exceptions.js'

export interface RequiredSpec {
  isRequired(): boolean
}

export interface LengthSpec {
  maxLength(): number
}

function implementsRequiredSpec(obj: unknown): obj is RequiredSpec {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  return 'isRequired' in obj && typeof obj.isRequired === 'function'
}

function implementsLengthSpec(obj: unknown): obj is LengthSpec {
  if (typeof obj !== 'object' || obj === null) {
    return false
  }
  return 'maxLength' in obj && typeof obj.maxLength === 'function'
}

export class StringValueObject extends ImmutableValueObject<string> {
  public static tryParse<T extends StringValueObject>(
    this: new (v: string) => T,
    input: string,
  ): T | undefined {
    const proto = (this as unknown as { prototype: unknown }).prototype

    if (implementsRequiredSpec(proto)) {
      if (proto.isRequired() && input === '') {
        return undefined
      }
    }

    if (implementsLengthSpec(proto)) {
      if (proto.maxLength() < input.length) {
        return undefined
      }
    }

    try {
      return new this(input)
    }
    catch {
      return undefined
    }
  }

  constructor(value: string) {
    super(value)

    if (typeof value !== 'string') {
      throw new ValidationException(`${value} は文字列型でなければいけません。`)
    }

    if (implementsRequiredSpec(this)) {
      if ((this as RequiredSpec).isRequired() && value === '') {
        throw new ValidationException(`${this.constructor.name} は必須値で空文字にできません。`)
      }
    }

    if (implementsLengthSpec(this)) {
      const maxLength = (this as LengthSpec).maxLength()
      if (maxLength < value.length) {
        throw new ValidationException(`${this.constructor.name} は最大長 ${maxLength} を超えています。`)
      }
    }
  }
}
