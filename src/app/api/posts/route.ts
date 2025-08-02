// src/app/api/posts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPostsCollection, SocialMediaPost } from '@/models/SocialMediaPost';
import { ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

// --- Cloudinary Configuration ---
// Place this at the top of your file
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// --- Your Existing GET Function (Unchanged) ---
export async function GET(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');
    const statusFilter = searchParams.get('status');
    
    // Build query filter
    const query: any = {};
    if (statusFilter) {
      query.status = statusFilter;
    }
    
    // Fetch posts sorted by creation date (newest first)
    const posts = await postsCollection
      .find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Get counts for dashboard
    const totalPosts = await postsCollection.countDocuments({});
    const draftPosts = await postsCollection.countDocuments({ status: 'draft' });
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
        draft: draftPosts,
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

// --- SECURED POST Function with File Upload Logic ---
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // --- 1. AUTHORIZATION CHECK ---
    const submittedKey = formData.get('secretKey') as string;
    const serverKey = process.env.POST_SECRET_KEY;

    if (!serverKey) {
        console.error('CRITICAL: POST_SECRET_KEY is not set on the server.');
        return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
    }

    if (submittedKey !== serverKey) {
        return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
    }

    // --- 2. Process the rest of the form data (as before) ---
    const postDataJSON = formData.get('postData') as string;
    const mediaFiles = formData.getAll('media') as File[];
    const isDraft = formData.get('isDraft') === 'true'; // Check if this is a draft

    if (!postDataJSON) {
      return NextResponse.json({ error: 'Post data is missing' }, { status: 400 });
    }
    const postData = JSON.parse(postDataJSON);

    // 3. Upload media files to Cloudinary
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

    // 4. Prepare the new post object for the database
    const postsCollection = await getSocialMediaPostsCollection();
    const newPost: Omit<SocialMediaPost, '_id'> = {
      ...postData,
      scheduled_date: new Date(postData.scheduled_date),
      post_media: mediaUrls, // Use the URLs from Cloudinary
      status: isDraft ? 'draft' : 'pending', // Set status based on whether it's a draft
      post_links: {},
      created_at: new Date(),
      updated_at: new Date(),
    };

    // 5. Insert into the database
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


// --- Updated PUT Function to handle draft and pending posts ---
export async function PUT(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Parse the request body
    // Handle FormData (for both JSON and file uploads)
    const formData = await request.formData();
    const id = formData.get('id') as string;
    const secretKey = formData.get('secretKey') as string;
    const postDataJSON = formData.get('postData') as string;
    const mediaFiles = formData.getAll('media') as File[];
    const deletedMediaJSON = formData.get('deletedMedia') as string;

    const updateData = JSON.parse(postDataJSON);
    
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
    
    // Find the post to check its status
    const post = await postsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Only require secret key for draft and pending posts
    if (post.status === 'draft' || post.status === 'pending') {
      const serverKey = process.env.POST_SECRET_KEY;

      if (!serverKey) {
          console.error('CRITICAL: POST_SECRET_KEY is not set on the server.');
          return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
      }

      if (secretKey !== serverKey) {
          return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
      }
    }
    
    // Prepare update data
    const updateFields: Partial<SocialMediaPost> = {
      ...updateData,
      scheduled_date: updateData.scheduled_date ? new Date(updateData.scheduled_date) : new Date(),
      updated_at: new Date()
    };

    // Handle media file uploads for editing
    let mediaUrls: string[] = [];
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

    // Parse deleted media
    let deletedMedia: { url: string; index: number }[] = [];
    if (deletedMediaJSON) {
      try {
        deletedMedia = JSON.parse(deletedMediaJSON);
      } catch (e) {
        console.error('Error parsing deleted media:', e);
      }
    }

    // Combine existing media URLs with newly uploaded ones, excluding deleted ones
    let finalMediaUrls: string[] = [];
    if (post.post_media && post.post_media.length > 0) {
      // Filter out deleted media from existing media
      finalMediaUrls = post.post_media.filter((url, index) => {
        // Check if this media is marked for deletion
        return !deletedMedia.some(deleted => deleted.index === index);
      });
    }

    if (mediaUrls.length > 0) {
      // Add newly uploaded media URLs
      finalMediaUrls = [...finalMediaUrls, ...mediaUrls];
    }

    // Update the post_media field with combined URLs
    if (finalMediaUrls.length > 0) {
      updateFields.post_media = finalMediaUrls;
    }
    
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
        scheduled_date: updatedPost.scheduled_date instanceof Date 
          ? updatedPost.scheduled_date.toISOString() 
          : updatedPost.scheduled_date
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

// --- Updated DELETE Function to handle secret key for draft and pending posts ---
export async function DELETE(request: NextRequest) {
  try {
    const postsCollection = await getSocialMediaPostsCollection();
    
    // Parse the request body
    const body = await request.json();
    const { id, secretKey } = body;
    
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
    
    // Find the post to check its status
    const post = await postsCollection.findOne({ _id: new ObjectId(id) });
    
    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }
    
    // Only require secret key for draft and pending posts
    // Posted posts can be deleted without secret key (as per user's requirement)
    if (post.status === 'draft' || post.status === 'pending') {
      const serverKey = process.env.POST_SECRET_KEY;

      if (!serverKey) {
          console.error('CRITICAL: POST_SECRET_KEY is not set on the server.');
          return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
      }

      if (secretKey !== serverKey) {
          return NextResponse.json({ error: 'Unauthorized: Invalid secret key.' }, { status: 401 });
      }
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
