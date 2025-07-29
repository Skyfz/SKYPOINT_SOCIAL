import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPostsCollection, SocialMediaPost } from '@/models/SocialMediaPost';
import { ObjectId } from 'mongodb';

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

export async function POST(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.post_text || !body.scheduled_date || !body.platforms || !Array.isArray(body.platforms)) {
      return NextResponse.json(
        { error: 'Missing required fields: post_text, scheduled_date, and platforms are required' },
        { status: 400 }
      );
    }
    
    // Create new post object
    const newPost: Omit<SocialMediaPost, '_id'> = {
      post_text: body.post_text,
      scheduled_date: new Date(body.scheduled_date),
      team: body.team || undefined,
      post_notes: body.post_notes || undefined,
      post_media: body.post_media || undefined,
      status: 'pending',
      platforms: body.platforms,
      post_links: {},
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Insert the new post
    const result = await postsCollection.insertOne(newPost as SocialMediaPost);
    
    // Fetch the created post
    const createdPost = await postsCollection.findOne({ _id: result.insertedId });
    
    if (!createdPost) {
      throw new Error('Failed to fetch created post');
    }
    
    return NextResponse.json({
      post: {
        ...createdPost,
        _id: createdPost._id.toString(),
        created_at: createdPost.created_at.toISOString(),
        updated_at: createdPost.updated_at.toISOString(),
        scheduled_date: createdPost.scheduled_date.toISOString()
      },
      message: 'Post created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Parse the request body
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }
    
    // Prepare update data
    const updateFields: Partial<SocialMediaPost> = {
      ...updateData,
      updated_at: new Date()
    };
    
    // Remove undefined fields
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key as keyof SocialMediaPost] === undefined) {
        delete updateFields[key as keyof SocialMediaPost];
      }
    });
    
    // Update the post
    const result = await postsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Fetch the updated post
    const updatedPost = await postsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!updatedPost) {
      throw new Error('Failed to fetch updated post');
    }
    
    return NextResponse.json({
      post: {
        ...updatedPost,
        _id: updatedPost._id.toString(),
        created_at: updatedPost.created_at.toISOString(),
        updated_at: updatedPost.updated_at.toISOString(),
        scheduled_date: updatedPost.scheduled_date.toISOString()
      },
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Parse the request body
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid post ID' },
        { status: 400 }
      );
    }
    
    // Delete the post
    const result = await postsCollection.deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
