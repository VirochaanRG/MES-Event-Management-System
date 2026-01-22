import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // 1. GLOBAL IGNORES
  {
    ignores: ["dist/**", "node_modules/**", "*.timestamp-*", "next-env.d.ts"],
  },

  // 2. CONFIG FILES (Standard Linting, No Type-Checking)
  {
    files: ["*.mjs", "*.js", "*.config.ts"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // 3. SOURCE CODE (Type-Aware Linting)
  {
    files: ["src/**/*.{ts,tsx}"],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked, // Enables deep type analysis
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Add your custom rules here
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // 4. SERVER SPECIFIC OVERRIDES
  {
    files: ["src/server/**/*.ts"],
    rules: {
      "no-console": "off",
    }
  }
);