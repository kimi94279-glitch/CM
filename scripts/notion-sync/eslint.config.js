import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// 독립 패키지 전용 ESLint(플랫) 설정. 루트(expo) 설정과 분리한다.
export default tseslint.config(
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended
);
