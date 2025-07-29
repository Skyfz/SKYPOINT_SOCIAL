// src/app/api/posts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPostsCollection, SocialMediaPost } from '@/models/SocialMediaPost';
import { ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import { formidable } from 'formidable';

// --- Cloudinary Configuration ---
// Place this at the top of your file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Helper function to upload a file to Cloudinary
async function uploadToCloudinary(filePath: string): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'social_media_posts', // Optional: store in a specific folder
  });
  return result.secure_url; // Return the secure URL of the uploaded file
}

// --- Your Existing GET Function (Unchanged) ---
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

// --- NEW POST Function with File Upload Logic ---
// This replaces your old POST function entirely
export async function POST(request: NextRequest) {
  try {
    // formidable needs the raw request, not the parsed body
    const formData = await request.formData();
    const postDataJSON = formData.get('postData') as string;
    const mediaFiles = formData.getAll('media') as File[];

    if (!postDataJSON) {
      return NextResponse.json({ error: 'Post data is missing' }, { status: 400 });
    }
    const postData = JSON.parse(postDataJSON);

    // 2. Upload media files to Cloudinary
    const mediaUrls: string[] = [];
    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        // Convert file to a buffer to upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Upload the buffer to Cloudinary
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'social_media_posts' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as { secure_url: string });
            }
          ).end(buffer);
        });
        
        mediaUrls.push(result.secure_url);
      }
    }

    // 3. Prepare the new post object for the database
    const postsCollection = await getSocialMediaPostsCollection();
    const newPost: Omit<SocialMediaPost, '_id'> = {
      ...postData,
      scheduled_date: new Date(postData.scheduled_date),
      post_media: mediaUrls, // Use the URLs from Cloudinary
      status: 'pending',
      post_links: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    // 4. Insert into the database
    const result = await postsCollection.insertOne(newPost as SocialMediaPost);
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
          scheduled_date: createdPost.scheduled_date.toISOString(),
        },
        message: 'Post created successfully'
      }, { status: 201 });

  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


// --- Your Existing PUT Function (Unchanged) ---
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

// --- Your Existing DELETE Function (Unchanged) ---
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
