import { Client } from '@notionhq/client';
import { UpdatePageParameters } from '@notionhq/client/build/src/api-endpoints';

// Initialize Notion client
const notion = new Client({ auth: process.env.NOTION_TOKEN });

interface UpdateResult {
  success: boolean;
  error?: string;
}

export async function updateNotionPageStatus(
  pageId: string,
  status: string,
  postLinks?: Record<string, string>
): Promise<UpdateResult> {
  try {
    // Prepare properties to update
    const properties: NonNullable<UpdatePageParameters['properties']> = {};
    
    // Update Status property if it exists
    if (status) {
      properties.Status = {
        select: {
          name: status
        }
      };
    }

    // Update Post Links property if it exists and we have links
    if (postLinks && Object.keys(postLinks).length > 0) {
      const linksText = Object.entries(postLinks)
        .map(([platform, url]) => `${platform}: ${url}`)
        .join('\n');
      
      properties['Post Links'] = {
        rich_text: [
          {
            text: {
              content: linksText
            }
          }
        ]
      };
    }

    // Update the page in Notion
    await notion.pages.update({
      page_id: pageId,
      properties
    });

    return { success: true };
  } catch (error) {
    console.error(`Error updating Notion page ${pageId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
