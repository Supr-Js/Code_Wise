CODEWISE_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "metrics": {
            "type": "object",
            "properties": {
                "loc": {"type":"integer"},
                "language": {"type":"string"},
                "maintainability_index": {"type":["number","null"]},
                "avg_complexity": {"type":["number","null"]},
                "mccabe_complexity": {"type":["number","null"]},
                "blank": {"type":["integer","null"]},
                "comment": {"type":["integer","null"]},
                "todos": {"type":["integer","null"]}
            },
            "required": ["loc","language"],
            "additionalProperties": False
        },
        "issues": {
            "type": "array",
            "items": {
                "type":"object",
                "properties": {
                    "line":{"type":"integer"},
                    "severity":{"type":"string","enum":["error","warn","info"]},
                    "message":{"type":"string"},
                    "suggestion":{"type":"string"},
                    "patch":{"type":"string"}
                },
                "required": ["line","severity","message"],
                "additionalProperties": False
            }
        },
        "fix": {
            "type":"object",
            "properties": {
                "strategy":{"type":"string","enum":["none","patch","full_rewrite"]},
                "patch":{"type":"string"},
                "fixed_code":{"type":"string"}
            },
            "required":["strategy"],
            "additionalProperties": False
        }
    },
    "required": ["summary","metrics","issues","fix"],
    "additionalProperties": False
}