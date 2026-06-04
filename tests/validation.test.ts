import { describe, it, expect } from 'vitest';
// 按子代理 A 的契约编写。A 完成 validation.ts 后由主流程统一验证。
import {
  TODO_TEXT_MAX,
  validateTodoCreate,
  validateTodoUpdate,
  validateGroupName,
} from '@/lib/validation';

describe('validation', () => {
  describe('validateTodoCreate', () => {
    it('接受合法的最小输入', () => {
      const r = validateTodoCreate({ text: '买牛奶' });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.text).toBe('买牛奶');
    });

    it('接受合法的完整输入', () => {
      const r = validateTodoCreate({
        text: '写报告',
        priority: 'P0',
        dueDate: '2026-06-10',
        groupId: 'g1',
        completed: false,
      });
      expect(r.ok).toBe(true);
    });

    it('拒绝空 text', () => {
      expect(validateTodoCreate({ text: '' }).ok).toBe(false);
      expect(validateTodoCreate({ text: '   ' }).ok).toBe(false);
      expect(validateTodoCreate({}).ok).toBe(false);
    });

    it('拒绝超长 text', () => {
      const long = 'a'.repeat(TODO_TEXT_MAX + 1);
      expect(validateTodoCreate({ text: long }).ok).toBe(false);
    });

    it('拒绝非法 priority', () => {
      expect(validateTodoCreate({ text: 'x', priority: 'P9' }).ok).toBe(false);
    });

    it('拒绝非法 dueDate', () => {
      expect(validateTodoCreate({ text: 'x', dueDate: 'not-a-date' }).ok).toBe(false);
    });
  });

  describe('validateTodoUpdate', () => {
    it('接受带 id 的合法更新', () => {
      const r = validateTodoUpdate({ id: 't1', text: '改' });
      expect(r.ok).toBe(true);
    });

    it('缺少 id 应拒绝', () => {
      expect(validateTodoUpdate({ text: '改' }).ok).toBe(false);
    });

    it('非法 priority 拒绝', () => {
      expect(validateTodoUpdate({ id: 't1', priority: 'X' }).ok).toBe(false);
    });
  });

  describe('validateGroupName', () => {
    it('接受合法名称', () => {
      const r = validateGroupName('工作');
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe('工作');
    });

    it('拒绝空名称', () => {
      expect(validateGroupName('').ok).toBe(false);
      expect(validateGroupName('   ').ok).toBe(false);
    });

    it('拒绝非字符串', () => {
      expect(validateGroupName(null).ok).toBe(false);
      expect(validateGroupName(123).ok).toBe(false);
    });
  });
});
