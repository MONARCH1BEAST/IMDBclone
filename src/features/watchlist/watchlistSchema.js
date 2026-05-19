import { z } from 'zod';

export const WatchlistEntrySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  poster: z.string().nullable(),
  addedAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  synced: z.boolean(),
  deleted: z.boolean().default(false),
});

export const WatchlistEntryInputSchema = WatchlistEntrySchema.omit({
  addedAt: true,
  updatedAt: true,
  synced: true,
  deleted: true,
});
