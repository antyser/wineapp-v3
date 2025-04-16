import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'src/api/openapi.json',
  output: 'src/api/generated',
  plugins: ['@hey-api/client-fetch'],
  typescript: {
    // Make it compatible with the existing codebase
    enumsAsConst: true,
    exportCommonTypes: true,
    exportNamespace: true,
    unionEnums: true,
  },
}); 