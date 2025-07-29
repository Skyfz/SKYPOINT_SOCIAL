import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPostsCollection } from '@/models/SocialMediaPost';

export async function GET(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    
    // Fetch posts sorted by creation date (newest first)
    const posts = await postsCollection
      .find({})
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get counts for dashboard
    const totalPosts = await postsCollection.countDocuments({});
    const pendingPosts = await postsCollection.countDocuments({ status: 'pending' });
    const postedPosts = await postsCollection.countDocuments({ status: 'posted' });
    const failedPosts = await postsCollection.countDocuments({ status: 'failed' });
    const partialSuccessPosts = await postsCollection.countDocuments({ status: 'partial_success' });
    
    return NextResponse.json({
      posts: posts.map(post => ({
        ...post,
        _id: post._id.toString(),
        created_at: post.created_at.toISOString(),
        updated_at: post.updated_at.toISOString(),
        scheduled_date: post.scheduled_date.toISOString()
      })),
      counts: {
        total: totalPosts,
        pending: pendingPosts,
        posted: postedPosts,
        failed: failedPosts,
        partialSuccess: partialSuccessPosts
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
