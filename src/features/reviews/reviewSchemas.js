import { z } from 'zod';

export const ReviewSchema = z.object({
  id: z.string().uuid(), // server-generated UUID
  movieId: z.number().int().positive(),
  userId: z.string().min(1),
  userName: z.string().min(1),
  rating: z.number().int().min(1).max(10), // 1–10 scale
  body: z.string().min(10).max(2000),
  createdAt: z.number().int().positive(), // Unix ms
  updatedAt: z.number().int().positive(),
  version: z.number().int().min(1),
  deleted: z.boolean().default(false),
  upvotes: z.number().int().min(0).default(0),
  downvotes: z.number().int().min(0).default(0),
  userVote: z.enum(['up', 'down']).nullable().default(null),
  revisions: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        body: z.string().optional(),
        originalBody: z.string().optional(),
        newBody: z.string().optional(),
        editedAt: z.number().int().positive(),
        version: z.number().int().min(1),
      })
    )
    .default([]),
  flagged: z.boolean().default(false),
});

export const ReviewInputSchema = z.object({
  movieId: z.number().int().positive(),
  rating: z
    .number()
    .int()
    .min(1, 'Rating must be at least 1')
    .max(10, 'Rating cannot exceed 10'),
  body: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(2000, 'Review cannot exceed 2000 characters'),
});

export const ReviewEditSchema = z.object({
  id: z.string().uuid(),
  body: z.string().min(10).max(2000),
});

export const VoteSchema = z.object({
  reviewId: z.string().uuid(),
  vote: z.enum(['up', 'down']),
});

export const FlagSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.string().min(1).max(200),
});

