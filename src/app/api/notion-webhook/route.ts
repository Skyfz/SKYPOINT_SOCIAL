import { NextRequest, NextResponse } from 'next/server';
import { getSocialMediaPostsCollection, SocialMediaPost } from '@/models/SocialMediaPost';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Extract data from Notion webhook payload
    const notionPageId = payload.page_id;
    const properties = payload.page.properties;

    // Extract specific fields
    const postText = properties['Post Text']?.rich_text?.[0]?.plain_text || '';
    const postMedia = properties['Post Media']?.files?.[0]?.file?.url || '';
    const scheduledDateStr = properties['Scheduled Date']?.date?.start;
    const team = properties['Team']?.select?.name || '';
    const postNotes = properties['Post Notes']?.rich_text?.[0]?.plain_text || '';
    const status = properties['Status']?.select?.name || 'pending';

    // Validate required fields
    if (!notionPageId || !postText || !scheduledDateStr) {
      return NextResponse.json(
        { error: 'Missing required fields in webhook payload' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledDateStr);
    const platforms = properties['Platforms']?.multi_select?.map((p: { name: string }) => p.name) || [];

    // Create new post object
    const newPost: Omit<SocialMediaPost, '_id'> = {
      notion_page_id: notionPageId,
      post_text: postText,
      post_media: postMedia,
      scheduled_date: scheduledDate,
      team: team,
      post_notes: postNotes,
      status: status,
      platforms: platforms,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // Save to MongoDB
    const postsCollection = await getSocialMediaPostsCollection();
    const result = await postsCollection.insertOne(newPost as SocialMediaPost);

    return NextResponse.json(
      { message: 'Post received and saved successfully', postId: result.insertedId },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing Notion webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
