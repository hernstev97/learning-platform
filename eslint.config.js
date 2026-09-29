import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-*/**', 'node_modules/**', 'convex/_generated/**', 'public/pyodide/**'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] } },
  // Existing content loaders and heterogeneous exercise renderers predate this integration.
  { files: ['tooling/content.ts', 'tooling/markdown.ts', 'tooling/verify-code.ts', 'src/engine/answers.test.ts', 'src/router.ts', 'src/pages/exercise.ts', 'src/python/runner.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  { files: ['src/pages/exercise.ts'], rules: { 'prefer-const': ['error', { ignoreReadBeforeAssign: true }] } },
);
