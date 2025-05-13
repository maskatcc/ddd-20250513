export class ImmutableValueObject<T> {
  public readonly value: T

  constructor(value: T) {
    this.value = value
  }

  equals(other: ImmutableValueObject<T>): boolean {
    if (this === other) {
      return true
    }

    if (other === null || other === undefined) {
      return false
    }

    return this.value === other.value
  }
}
