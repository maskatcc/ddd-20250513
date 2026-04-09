import type { DomainError } from './DomainResult.js'

export type EmailAlreadyRegistered = DomainError<'USER_EMAIL_ALREADY_REGISTERED', { email: string }>
export type OrganizationNotFound = DomainError<'ORGANIZATION_NOT_FOUND'>
