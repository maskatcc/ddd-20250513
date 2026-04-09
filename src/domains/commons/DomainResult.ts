export type DomainError<
  Code extends string = string,
  Payload extends Record<string, unknown> = Record<string, never>,
> = Readonly<
  { code: Code, message: string } &
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Payload未指定時にフィールドを追加しないための意図的な空型
  ([Payload] extends [Record<string, never>] ? {} : { payload: Payload })
>

export type DomainResult<T, E extends DomainError = DomainError> =
  | { readonly successful: true, readonly domainValue: T }
  | { readonly successful: false, readonly domainError: E }

export function succeed<T>(domainValue: T): DomainResult<T, never> {
  return { successful: true, domainValue }
}

export function fail<E extends DomainError>(domainError: E): DomainResult<never, E> {
  return { successful: false, domainError }
}

export function assertNever(x: never): never {
  throw new Error(`Unhandled domain error: ${JSON.stringify(x)}`)
}
