import { z } from "zod";

export const loginSchema = {
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
};

export type LoginInput = { [K in keyof typeof loginSchema]: string };

/** GET /me/ (keyed-backend common.serializers.MeSerializer) */
export const meSchema = z.object({
  id: z.number(),
  /** UserType: 1 student, 2 staff, 3 guardian */
  role: z.number().nullable(),
  campus: z.number().nullable(),
  student_id: z.number().nullable(),
  staff_id: z.number().nullable(),
  guardian_id: z.number().nullable(),
  /** StaffRole, staff only */
  staff_role: z.number().nullable(),
});

export type Me = z.infer<typeof meSchema>;
