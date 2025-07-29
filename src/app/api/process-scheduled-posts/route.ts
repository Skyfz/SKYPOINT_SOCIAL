import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPostsCollection } from '@/models/SocialMediaPost';
import { postToSocialMedia } from '@/services/socialMediaService';
import { updateNotionPageStatus } from '@/services/notionService';

export async function GET(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Find posts that are pending and scheduled for now or in the past
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // Within the next hour
    
    const pendingPosts = await postsCollection
      .find({
        status: 'pending',
        scheduled_date: { $lte: oneHourFromNow }
      })
      .toArray();

    if (pendingPosts.length === 0) {
      return NextResponse.json(
        { message: 'No pending posts to process' },
        { status: 200 }
      );
    }

    // Process each pending post
    const results = [];
    for (const post of pendingPosts) {
      try {
        // Execute social media posting
        const postResult = await postToSocialMedia(post);
        
        // Update post status and links in MongoDB
        const updateData: any = {
          status: postResult.success ? 'posted' : 'failed',
          post_links: postResult.links,
          updated_at: new Date()
        };

        await postsCollection.updateOne(
          { _id: post._id },
          { $set: updateData }
        );

        // Update Notion page status
        await updateNotionPageStatus(
          post.notion_page_id,
          updateData.status,
          updateData.post_links
        );

        results.push({
          postId: post._id,
          notionPageId: post.notion_page_id,
          status: updateData.status,
          links: updateData.post_links,
          success: postResult.success,
          error: postResult.error || null
        });
      } catch (error) {
        console.error(`Error processing post ${post._id}:`, error);
        
        // Update post status to failed in MongoDB
        await postsCollection.updateOne(
          { _id: post._id },
          { 
            $set: { 
              status: 'failed',
              updated_at: new Date()
            }
          }
        );

        results.push({
          postId: post._id,
          notionPageId: post.notion_page_id,
          status: 'failed',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${pendingPosts.length} pending posts`,
      results
    });
  } catch (error) {
    console.error('Error processing scheduled posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
