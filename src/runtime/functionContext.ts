import { KeycloakLib } from './keycloakLib.js'
import { PostgresqlLib } from './postgresqlLib.js'

type FunctionContext = {
  Keycloak: KeycloakLib
  Postgresql?: PostgresqlLib
}

export {
  FunctionContext,
  KeycloakLib,
  PostgresqlLib,
}
