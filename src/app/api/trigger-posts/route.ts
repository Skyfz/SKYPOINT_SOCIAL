// src/app/api/cron/trigger-posts/route.ts

import { NextResponse } from 'next/server';
import { getSocialMediaPostsCollection } from '@/models/SocialMediaPost';

/**
 * This cron job runs periodically to find pending social media posts.
 * It sends the full post data to a Make.com webhook for processing.
 */
export async function GET() {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    const makeApiKey = process.env.MAKE_API_KEY;

    // Ensure webhook URL and API key are configured in your environment variables
    if (!makeWebhookUrl || !makeApiKey) {
      console.error('MAKE_WEBHOOK_URL or MAKE_API_KEY environment variable is not set.');
      return NextResponse.json(
        { error: 'Server configuration error: Webhook URL or API Key is missing.' },
        { status: 500 }
      );
    }

    // Find posts that are pending and scheduled for now or in the past
    // Note: We only process 'pending' posts, not 'draft' posts
    const now = new Date();
    const pendingPosts = await postsCollection
      .find({
        status: 'pending',
        scheduled_date: { $lte: now }
      })
      .toArray();

    if (pendingPosts.length === 0) {
      return NextResponse.json(
        { message: 'No pending posts to trigger.' },
        { status: 200 }
      );
    }

    const results = [];

    for (const post of pendingPosts) {
      try {
        // 1. Prepare the full post payload for Make.com.
        // This removes the need for Make.com to query your database.
        const postPayload = {
          post_id: post._id.toString(),
          post_text: post.post_text,
          post_media: post.post_media, // This is already an array of Cloudinary URLs
          post_date: post.scheduled_date,
          post_status: post.status,
          platforms: post.platforms,
        };

        // 2. Trigger the Make.com webhook with the full post data
        const response = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-make-apikey': makeApiKey,
          },
          body: JSON.stringify(postPayload),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Make.com webhook returned status ${response.status}: ${errorBody}`);
          throw new Error(`Make.com webhook returned status ${response.status}`);
        }

        // 3. Update the post's status to 'processing'.
        // This prevents the post from being picked up again by the next cron run.
        // The final status ('posted' or 'failed') will be set by your new cleanup endpoint.
        await postsCollection.updateOne(
          { _id: post._id },
          { $set: { status: 'partial_success', updated_at: new Date() } }
        );

        results.push({
          postId: post._id.toString(),
          status: 'success',
          detail: 'Webhook triggered successfully with full post data.',
        });

      } catch (error) {
        console.error(`Failed to trigger webhook for post ${post._id}:`, error);
        // If triggering the webhook fails, update the status to 'trigger_failed'
        await postsCollection.updateOne(
          { _id: post._id },
          { $set: { status: 'failed', updated_at: new Date() } }
        );
        results.push({
          postId: post._id.toString(),
          status: 'error',
          detail: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${pendingPosts.length} posts.`,
      results,
    });

  } catch (error) {
    console.error('Error in cron trigger job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
