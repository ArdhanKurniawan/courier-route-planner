# Phase 3A — Scenario Freeze Input Contract

`benchmark-case-input/v1` freezes the research input from one draft Scenario, its Depot, and its complete Order set. The application supplies the three entities from a consistent read. The domain validates ownership, positive canonical signed BIGINT identities, nullable signed BIGINT seed, bounded coordinates, and at least one Order. It returns frozen copies. A Depot and an Order can share a numeric ID because their kinds are distinct.

The snapshot keeps Scenario configuration, Depot fields, Order fields, and optional provenance. `configuredCustomerCount` records Scenario configuration. `actualOrderCount` is the number of copied Orders, and `pointCount` includes the Depot. The Depot has index `0`. Orders have indices `1..n` in ascending numeric ID order. Each index identifies a row and column in the future distance matrix and a node in the solver route.

## Serialization

Hash the exact UTF-8 bytes of compact ECMAScript `JSON.stringify` output using SHA-256. The output includes no BOM, whitespace padding, or final newline. Use the key order in the vectors below. IDs and seed are decimal strings. Coordinates use their original finite binary64 values with `-0` normalized to `0`. Output uses lowercase hexadecimal.

The hash binds Scenario and point identities, point kind and index, original coordinates, pattern, configured count, radius bounds, seed, and generator version. Missing generator version is represented as `null`. Labels, addresses, Order code and source, operational status, freeze time, generated case ID, and source commit SHA are stored outside the preimage. Matrix provider, profile, snapping evidence, and distances belong to the separate [OSRM distance contract](../../34_OSRM_DISTANCE_CONTRACT.md).

## Golden vectors

Four Orders supplied out of order, including consecutive IDs across the JavaScript safe-integer boundary. The configured count is seven.

```json
{"version":"benchmark-case-input/v1","scenario":{"id":"9007199254740993","depotId":"2","distributionPattern":"random","configuredCustomerCount":7,"radiusMinM":100,"radiusMaxM":1000,"generationSeed":"-9223372036854775808","generatorVersion":"random-v1"},"nodes":[{"index":0,"kind":"depot","id":"2","latitude":0,"longitude":110.123456789},{"index":1,"kind":"order","id":"2","latitude":-6.123456789,"longitude":110.5},{"index":2,"kind":"order","id":"10","latitude":-7,"longitude":0},{"index":3,"kind":"order","id":"9007199254740992","latitude":-8,"longitude":109},{"index":4,"kind":"order","id":"9007199254740993","latitude":-9,"longitude":108}]}
```

SHA-256 `6aa77120acb91738d0c41c49ba2db785291a025f308bbee2eae85495ad56cb93`.

One Order with null generator configuration, a maximum signed BIGINT Depot ID, and a sub-microdegree coordinate.

```json
{"version":"benchmark-case-input/v1","scenario":{"id":"1","depotId":"9223372036854775807","distributionPattern":"directional","configuredCustomerCount":0,"radiusMinM":null,"radiusMaxM":null,"generationSeed":null,"generatorVersion":null},"nodes":[{"index":0,"kind":"depot","id":"9223372036854775807","latitude":90,"longitude":180},{"index":1,"kind":"order","id":"1","latitude":5e-8,"longitude":-180}]}
```

SHA-256 `9421ea35c9167016a9dbc4bc3623e615518d6f40fa329e3b50cd744629c38f50`.

A change to the preimage schema or number representation requires a new version and new vectors. The persistence layer must verify stored node order before hash reconstruction so a reordered set fails integrity validation.
