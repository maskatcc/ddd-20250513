export type DomainError = { code: string, message: string }

export type DomainResult<T, E extends DomainError = DomainError> =
  | { successful: true, domainValue: T }
  | { successful: false, domainError: E }

export function succeed<T>(domainValue: T): DomainResult<T, never> {
  return { successful: true, domainValue }
}

export function fail<E extends DomainError>(domainError: E): DomainResult<never, E> {
  return { successful: false, domainError }
}
