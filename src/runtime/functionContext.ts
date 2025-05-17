import { Context as LambdaContext } from 'aws-lambda'
import { KeycloakLib } from './keycloakLib.js'
import { PostgresqlLib } from './postgresqlLib.js'

type FunctionContext = {
  lambdaContext: LambdaContext
  keycloak: KeycloakLib
  postgresql?: PostgresqlLib
}

function createFunctionContext(lambdaContext?: LambdaContext): FunctionContext {
  return {
    lambdaContext: lambdaContext ?? {} as LambdaContext,
    keycloak: new KeycloakLib(),
  }
}

export {
  type FunctionContext,
  createFunctionContext,
  KeycloakLib,
  PostgresqlLib,
}
