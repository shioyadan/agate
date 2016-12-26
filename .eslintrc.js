module.exports = {
    "env": {
        "browser": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            4
        ],
        "linebreak-style": [
            "error",
            "windows"
        ],
        "quotes": [
            "error",
            "double"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-var": [
            "error"
        ]
    },

    // HTML 内のスクリプトをチェックするためにプラグインを有効化
    "plugins": ["html"],

    //
    "parserOptions": {
        "ecmaVersion": 6,
    },
};