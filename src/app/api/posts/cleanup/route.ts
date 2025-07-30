// src/app/api/posts/cleanup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPostsCollection, SocialMediaPost } from '@/models/SocialMediaPost';
import { ObjectId } from 'mongodb';

/**
 * This endpoint is called by Make.com after it has attempted to post to social media.
 * It receives the original post_id and the URLs of the successful posts.
 * It then updates the post in the database with the final status and links.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // The body from Make.com should contain the original post_id and the resulting URLs
    const { post_id, facebook_url, linkedin_url, instagram_url, x_url } = body;

    if (!post_id) {
      return NextResponse.json({ error: 'post_id is required from Make.com' }, { status: 400 });
    }

    if (!ObjectId.isValid(post_id)) {
      return NextResponse.json({ error: 'Invalid post_id format' }, { status: 400 });
    }

    const postsCollection = await getSocialMediaPostsCollection();

    // Create a 'post_links' object with the URLs that were successfully returned
    const post_links: { [key: string]: string } = {};
    if (facebook_url) post_links.facebook = facebook_url;
    if (linkedin_url) post_links.linkedin = linkedin_url;
    if (instagram_url) post_links.instagram = instagram_url;
    if (x_url) post_links.x = x_url;

    // Determine the final status. If at least one URL was returned, we'll call it 'posted'.
    // If no URLs were returned, the post failed.
    const finalStatus = Object.keys(post_links).length > 0 ? 'posted' : 'failed';
    
    const updateFields: Partial<SocialMediaPost>  = {
        status: finalStatus,
        updated_at: new Date(),
        post_links: post_links
    };

    // If it failed, add a reason for easier debugging.
    if (finalStatus === 'failed') {
        updateFields.failure_reason = "Make.com scenario completed but returned no post URLs.";
    }

    // Find the post by its ID and update it with the final status and links
    const result = await postsCollection.updateOne(
      { _id: new ObjectId(post_id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      console.error(`Cleanup webhook called for non-existent post_id: ${post_id}`);
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: `Post ${post_id} successfully updated with status '${finalStatus}'.`,
    });

  } catch (error) {
    console.error('Error in post cleanup webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error during post cleanup' },
      { status: 500 }
    );
  }
}
