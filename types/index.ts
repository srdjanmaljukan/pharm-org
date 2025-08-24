import {z} from "zod";
import { insertOrderSchema } from "@/lib/validators";
import { OrderStatus, Worker } from "@/lib/generated/prisma";

export type Order = z.infer<typeof insertOrderSchema> & {
    id: string;
    status: OrderStatus;
    distributor: string;
    createdAt: Date;
    updatedAt: Date;
    updatedById: string;
    updatedBy: Worker;
}