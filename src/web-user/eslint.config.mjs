import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  {
    // 1. Ignore build artifacts and temp files
    ignores: ["dist/**", "node_modules/**", "*.timestamp-*"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        // This tells ESLint to find the closest tsconfig for each file
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // 2. Specific overrides for your Fastify server folder
    files: ["src/server/**/*.ts"],
    rules: {
      "no-console": "off",
    }
  }
);