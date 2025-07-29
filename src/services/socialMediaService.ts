import { SocialMediaPost } from '@/models/SocialMediaPost';

interface PostResult {
  success: boolean;
  links?: Record<string, string>;
  error?: string;
}

// --- IMPORTANT: Get these from your .env.local file ---
const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
// This should be your Company Page URN, not a personal one.
const LINKEDIN_ORG_URN = process.env.LINKEDIN_ORG_URN; // e.g., 'urn:li:organization:73993421'


interface LinkedInMediaRegistrationResponse {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
        headers: Record<string, string>;
      };
    };
    asset: string;
  };
}

async function registerLinkedInMedia(mediaType: 'image' | 'video'): Promise<LinkedInMediaRegistrationResponse | null> {
  try {
    if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_ORG_URN) {
      throw new Error('LinkedIn access token or organization URN not configured');
    }

    const recipe = mediaType === 'image' 
      ? 'urn:li:digitalmediaRecipe:feedshare-image'
      : 'urn:li:digitalmediaRecipe:feedshare-video';

    const response = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: [recipe],
          owner: LINKEDIN_ORG_URN, // Using Organization URN
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('LinkedIn media registration error:', response.status, errorData);
      return null;
    }

    const result: LinkedInMediaRegistrationResponse = await response.json();
    return result;
  } catch (error) {
    console.error('LinkedIn media registration error:', error);
    return null;
  }
}

async function uploadMediaToLinkedIn(uploadUrl: string, mediaBuffer: Buffer, mediaType: 'image' | 'video'): Promise<boolean> {
  try {
    const contentType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
      },
      body: mediaBuffer
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('LinkedIn media upload error:', response.status, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('LinkedIn media upload error:', error);
    return false;
  }
}

async function postToFacebook(post: SocialMediaPost): Promise<PostResult> {
  try {
    // This is your original placeholder that simulates a successful post
    console.log(`Posting to Facebook: ${post.post_text}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock response with a fake URL
    return {
      success: true,
      links: {
        facebook: `https://facebook.com/post/${Date.now()}`
      }
    };
  } catch (error) {
    console.error('Facebook posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function postToLinkedIn(post: SocialMediaPost): Promise<PostResult> {
  try {
    if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_ORG_URN) {
      return {
        success: false,
        error: 'LinkedIn access token or organization URN not configured'
      };
    }

    // Check if post has media
    if (post.post_media && post.post_media.length > 0) {
      const mediaUrl = post.post_media[0];
      const isVideo = mediaUrl.match(/\.(mp4|mov|avi|wmv|flv|webm)$/i);
      const mediaType = isVideo ? 'video' : 'image';
      
      const registrationResponse = await registerLinkedInMedia(mediaType);
      if (!registrationResponse) {
        return { success: false, error: 'Failed to register media upload with LinkedIn' };
      }

      try {
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) throw new Error(`Failed to download media: ${mediaResponse.status}`);
        
        const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());
        
        const uploadSuccess = await uploadMediaToLinkedIn(
          registrationResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl,
          mediaBuffer,
          mediaType
        );
        
        if (!uploadSuccess) {
          return { success: false, error: 'Failed to upload media to LinkedIn using api' };
        }
      } catch (downloadError) {
        console.error('Media download error:', downloadError);
        return { success: false, error: `Failed to download media: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}` };
      }

      const url = 'https://api.linkedin.com/v2/ugcPosts';
      
      const postData = {
        author: LINKEDIN_ORG_URN, // Use Organization URN
        lifecycleState: 'DRAFT', // Set to DRAFT for testing
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: post.post_text },
            shareMediaCategory: mediaType.toUpperCase(),
            media: [{
              status: 'READY',
              description: { text: post.post_text.substring(0, 200) },
              media: registrationResponse.value.asset,
              title: { text: post.post_text.substring(0, 50) }
            }]
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LinkedIn API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      const postId = result.id;
      const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

      return { success: true, links: { linkedin: postUrl } };
    } else {
      // Text-only post
      const url = 'https://api.linkedin.com/v2/ugcPosts';
      
      const postData = {
        author: LINKEDIN_ORG_URN, // Use Organization URN
        lifecycleState: 'DRAFT', // Set to DRAFT for testing
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: post.post_text },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LinkedIn API error: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      const postId = result.id;
      const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

      return { success: true, links: { linkedin: postUrl } };
    }
  } catch (error) {
    console.error('LinkedIn posting error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function postToInstagram(post: SocialMediaPost): Promise<PostResult> {
  try {
    // This is your original placeholder that simulates a successful post
    console.log(`Posting to Instagram: ${post.post_text}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock response with a fake URL
    return {
      success: true,
      links: {
        instagram: `https://instagram.com/p/${Date.now().toString(36)}`
      }
    };
  } catch (error) {
    console.error('Instagram posting error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function postToSocialMedia(post: SocialMediaPost): Promise<PostResult> {
  const results: PostResult = {
    success: true,
    links: {}
  };

  // Process each platform
  for (const platform of post.platforms) {
    let platformResult: PostResult;

    switch (platform.toLowerCase()) {
      case 'facebook':
        platformResult = await postToFacebook(post);
        break;
      case 'linkedin':
        platformResult = await postToLinkedIn(post);
        break;
      case 'instagram':
        platformResult = await postToInstagram(post);
        break;
      default:
        platformResult = {
          success: false,
          error: `Unsupported platform: ${platform}`
        };
    }

    // If any platform fails, mark overall as partial success
    if (!platformResult.success) {
      results.success = false;
    }

    // Merge links
    if (platformResult.links) {
      results.links = {
        ...results.links,
        ...platformResult.links
      };
    }

    // Add error information if present
    if (platformResult.error) {
      results.error = results.error ? 
        `${results.error}; ${platform}: ${platformResult.error}` : 
        `${platform}: ${platformResult.error}`;
    }
  }

  return results;
}
