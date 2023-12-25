"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteSchema = void 0;
const tslib_1 = require("tslib");
/**
 * DIY "Schema Stitching"
 *
 * Interleaves the remote GraphQL schema with the locally defined schema
 * to create a single unified schema for fetching from the client.
 */
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const graphql_1 = require("graphql");
const LOCAL_SCHEMA_EXTENSIONS = `
scalar JSON

extend type Mutation {
  """
  Used internally to update the URQL cache in the CloudDataSource
  """
  _cloudCacheInvalidate(args: JSON): Boolean
}
`;
// Get the Remote schema we've sync'ed locally
exports.remoteSchema = (0, graphql_1.buildSchema)(
// ignoring since this happens on the first tick
// eslint-disable-next-line no-restricted-syntax
fs_1.default.readFileSync(path_1.default.join(__dirname, '../../schemas', 'cloud.graphql'), 'utf-8') + LOCAL_SCHEMA_EXTENSIONS, { assumeValid: true });
