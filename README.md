# qred-node
See `qred-java` for information on how to run.

```
src/index.ts                      boot + db
src/app.ts                        http, swagger, error json
src/api/payment/import-route.ts   the endpoint
src/api/payment/import-service.ts parse -> validate -> insert (1 tx)
src/api/payment/validation.ts     row checks
src/api/payment/parsers/          csv, xml, detect
tests/                            vitest
examples/                         *-1 are valid
AGENTS.md                         spec for the agent
.env                              DATABASE_URL, PORT
```

