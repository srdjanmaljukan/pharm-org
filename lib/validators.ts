import {z} from "zod";

// Schema for inserting orders
export const insertOrderSchema = z.object({
    productName: z.string().min(1, "Product name must be at least 1 character"),
    qty: z.coerce.number(),
    phoneNumber: z.string().min(1, "Phone number must be at least 1 character"),
    personName: z.string().optional(),
    note: z.string().optional(),
})

// Schema for signing users in
export const signInFormSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});