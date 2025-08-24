import {z} from "zod";

// Schema for inserting orders
export const insertOrderSchema = z.object({
    productName: z.string().min(1, "Product name must be at least 1 character"),
    qty: z.coerce.number(),
    phoneNumber: z.string().min(1, "Phone number must be at least 1 character"),
    personName: z.string().optional(),
    note: z.string().optional(),
})