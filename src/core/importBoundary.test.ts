import { describe, expect, it } from 'vitest';
import { ESLint } from 'eslint';

describe('core import boundary', () => {
  it('rejects UI framework and component imports from core modules', async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(
      "import 'react';\nimport 'react-dom';\nimport 'lucide-react';\nimport '../components/Header';",
      { filePath: 'src/core/boundary-probe.ts' }
    );

    expect(result.messages.filter((message) => message.ruleId === 'no-restricted-imports')).toHaveLength(4);
  });
});
