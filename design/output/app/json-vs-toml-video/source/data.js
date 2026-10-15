window.MEASURED = {
 "json": [
  "JSON.parse",
  "json · Python",
  "serde_json",
  "serde_json · arb_prec",
  "encoding/json",
  "encoding/json/v2",
  "jq",
  "jsonc-parser",
  "json5 · JS",
  "json5 · Python"
 ],
 "toml": [
  "tomllib · 3.14",
  "tomllib · 3.15",
  "tomli",
  "tomlkit",
  "toml · Rust",
  "toml_edit",
  "BurntSushi/toml",
  "go-toml/v2",
  "smol-toml",
  "@iarna/toml"
 ],
 "ids": {
  "json": [
   "js:JSON.parse",
   "py:json",
   "rs:serde_json",
   "rs:serde_json[arbitrary_precision]",
   "go:encoding/json",
   "go:encoding/json/v2",
   "jq",
   "js:jsonc-parser",
   "js:json5",
   "py:json5"
  ],
  "toml": [
   "py:tomllib",
   "py315:tomllib",
   "py:tomli",
   "py:tomlkit",
   "rs:toml",
   "rs:toml_edit",
   "go:BurntSushi/toml",
   "go:go-toml/v2",
   "js:smol-toml",
   "js:@iarna/toml"
  ]
 },
 "scenes": {
  "base": {
   "json": [
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ]
   ],
   "toml": [
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ],
    [
     "ok",
     "same data"
    ]
   ]
  },
  "comment": {
   "json": [
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ]
   ],
   "toml": [
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ],
    [
     "ok",
     "skips it"
    ]
   ]
  },
  "trailing_comma": {
   "json": [
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "ok",
     "accepts"
    ],
    [
     "ok",
     "accepts"
    ]
   ]
  },
  "duplicate": {
   "json": [
    [
     "diff",
     "port = 9090"
    ],
    [
     "diff",
     "port = 9090"
    ],
    [
     "diff",
     "port = 9090"
    ],
    [
     "diff",
     "port = 9090"
    ],
    [
     "diff",
     "port = 9090"
    ],
    [
     "err",
     "error"
    ],
    [
     "diff",
     "port = 9090"
    ],
    [
     "diff",
     "port = 9090"
    ],
    [
     "diff",
     "port = 9090"
    ],
    [
     "diff",
     "port = 9090"
    ]
   ],
   "toml": [
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ]
   ]
  },
  "big_int": {
   "json": [
    [
     "diff",
     "…992"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "diff",
     "…992"
    ],
    [
     "diff",
     "…992"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "diff",
     "…992"
    ],
    [
     "diff",
     "…992"
    ],
    [
     "ok",
     "…993"
    ]
   ],
   "toml": [
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "ok",
     "…993"
    ],
    [
     "err",
     "error"
    ],
    [
     "ok",
     "…993"
    ]
   ]
  },
  "date": {
   "json": [
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ],
    [
     "ok",
     "string"
    ]
   ],
   "toml": [
    [
     "ok",
     "datetime"
    ],
    [
     "ok",
     "datetime"
    ],
    [
     "ok",
     "datetime"
    ],
    [
     "ok",
     "datetime"
    ],
    [
     "ok",
     "Datetime"
    ],
    [
     "ok",
     "Datetime"
    ],
    [
     "ok",
     "time.Time"
    ],
    [
     "ok",
     "time.Time"
    ],
    [
     "ok",
     "TomlDate"
    ],
    [
     "ok",
     "Date"
    ]
   ]
  },
  "null": {
   "json": [
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ],
    [
     "ok",
     "null"
    ]
   ],
   "toml": [
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ],
    [
     "err",
     "error"
    ]
   ]
  },
  "scope": {
   "json": [
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ],
    [
     "ok",
     "top level"
    ]
   ],
   "toml": [
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ],
    [
     "diff",
     "server.debug"
    ]
   ]
  },
  "toml11": {
   "toml": [
    [
     "err",
     "error"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "ok",
     "reads it"
    ],
    [
     "err",
     "error"
    ]
   ]
  }
 },
 "versions": {
  "py:json": "stdlib (Python 3.14.4)",
  "py:json5": "0.15.0",
  "py:tomllib": "stdlib (Python 3.14.4)",
  "py:tomli": "2.5.0",
  "py:tomlkit": "0.15.1",
  "py315:tomllib": "stdlib (Python 3.15.0rc1, release candidate)",
  "jq": "jq-1.8.1",
  "js:JSON.parse": "node v24.21.0 (V8 13.6.233.17-node.53)",
  "js:json5": "2.2.3",
  "js:jsonc-parser": "3.3.1",
  "js:smol-toml": "1.9.0",
  "js:@iarna/toml": "2.2.5",
  "rs:serde_json": "1.0.151",
  "rs:toml": "1.1.7+spec-1.1.0",
  "rs:toml_edit": "0.25.16+spec-1.1.0",
  "rs:serde_json[arbitrary_precision]": "1.0.151 +arbitrary_precision",
  "go:BurntSushi/toml": "v1.6.0",
  "go:encoding/json": "go1.27.2",
  "go:encoding/json/v2": "go1.27.2",
  "go:go-toml/v2": "v2.4.3"
 },
 "measured_utc": "2026-10-14T21:50:31Z"
};
