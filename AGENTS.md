# qred-node

# 1. Goal
This service handles importing of payments in CSV or XML format. Examples
of the files can be found in `examples`. Only the two files with suffix 1 are valid.

# 2. Context
See qred-java for information to ensure a uniform API:
- error responses & error codes
- swagger
- the domain
- db schema how database objects gets created

# 3. Tests
Applies to both CSV and XML.

## 3.1 Bad request
The following cases should return bad request with the given code. The convention is: `WHAT_WHY`.

```
empty file (zero rows) - FILE_EMPTY
file too large (max 1 MB) - FILE_TOO_LARGE
not csv/xml - FILE_UNSUPPORTED
bad csv - CSV_INVALID
bad xml - XML_INVALID
missing column - COLUMN_MISSING
payment date in the future - see qred-java
invalid date - DATE_INVALID
amount <= 0 - see qred-java
amount too many decimals - see qred-java
invalid amount (not a number) - AMOUNT_INVALID
amount too large - AMOUNT_TOO_LARGE
invalid type - TYPE_INVALID
missing contract - see qred-java
```

The import operation must be atomic. Do not insert anything if a row fails.

## 3.2 Success
If the file passes all the validation, return 204 (like qred-java).

