import { z } from 'zod';



export const InstancesEnumSchema = z.enum(['ado', 'github']);
export type InstancesEnum = z.infer<typeof InstancesEnumSchema>;

