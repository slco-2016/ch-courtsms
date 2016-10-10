module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": [
            "error",
            2
        ],
        "camelcase": ["error"],
        "prefer-const": ["error"],
        "comma-style": ["error", "last"],
        "comma-dangle": ["error", "always"],
        "quote-props": ["error", "as-needed"],
        "no-var": ["error"],
        "new-cap": ["error"],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "id-length": ["error"],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
    }
};