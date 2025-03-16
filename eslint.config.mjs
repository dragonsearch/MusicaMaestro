// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        plugins: {
            js
        },
        extends: ["js/recommended"],
        languageOptions: {
            globals: globals.node
        },
        rules: {
            "no-unused-vars": "warn"
        }
    }
]);