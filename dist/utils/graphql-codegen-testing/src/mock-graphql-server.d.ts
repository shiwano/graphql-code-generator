import { GraphQLSchema } from 'graphql';
import nock from 'nock';
export declare function mockGraphQLServer({
  schema,
  host,
  path,
  intercept,
  method,
}: {
  schema: GraphQLSchema;
  host: string;
  path: string | RegExp | ((path: string) => boolean);
  intercept?: (obj: nock.ReplyFnContext) => void;
  method?: string;
}): nock.Scope;
