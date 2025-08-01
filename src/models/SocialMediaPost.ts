import { Collection } from 'mongodb';
import { getDb } from '@/lib/mongodb';

export interface SocialMediaPost {
  post_text: string;
  post_media?: string[];
  scheduled_date: Date;
  team?: string;
  post_notes?: string;
  status: 'draft' | 'pending' | 'posted' | 'failed' | 'partial_success';
  post_links?: Record<string, string>;
  platforms: string[];
  created_at: Date;
  updated_at: Date;
  failure_reason?: string;
}

export async function getSocialMediaPostsCollection(): Promise<Collection<SocialMediaPost>> {
  const db = await getDb();
  return db.collection<SocialMediaPost>('social_media_posts');
}
