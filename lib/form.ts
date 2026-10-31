import type { ZodType } from "zod";

// react-hook-form `validate` rule that reports the first zod issue
export const zodRule = (schema: ZodType) => (value: unknown) => {
  const result = schema.safeParse(value);
  return result.success || result.error.issues[0].message;
};
