/**
 * Social Media Posting Service
 *
 * Real API integrations for Instagram (Graph API), Facebook Pages,
 * and TikTok. Falls back gracefully when tokens aren't configured.
 */

export interface SocialPostResult {
  platform: string
  success: boolean
  postId?: string
  postUrl?: string
  error?: string
}

// ── Instagram (via Meta Graph API) ────────────────────────

async function postToInstagram(
  caption: string,
  imageUrl?: string,
): Promise<SocialPostResult> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

  if (!token || !igUserId) {
    return { platform: 'instagram', success: false, error: 'INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID not configured' }
  }

  try {
    if (imageUrl) {
      // Step 1: Create media container
      const containerRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption,
            access_token: token,
          }),
        },
      )
      const container = await containerRes.json()
      if (!container.id) {
        return { platform: 'instagram', success: false, error: container.error?.message || 'Container creation failed' }
      }

      // Step 2: Publish the container
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: token,
          }),
        },
      )
      const published = await publishRes.json()
      if (published.id) {
        return {
          platform: 'instagram',
          success: true,
          postId: published.id,
          postUrl: `https://www.instagram.com/p/${published.id}/`,
        }
      }
      return { platform: 'instagram', success: false, error: published.error?.message || 'Publish failed' }
    } else {
      // Text-only not supported on IG — need an image
      return { platform: 'instagram', success: false, error: 'Instagram requires an image_url for posts' }
    }
  } catch (err) {
    return { platform: 'instagram', success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Facebook Page (via Graph API) ─────────────────────────

async function postToFacebook(
  message: string,
  link?: string,
): Promise<SocialPostResult> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID

  if (!token || !pageId) {
    return { platform: 'facebook', success: false, error: 'FACEBOOK_PAGE_ACCESS_TOKEN or FACEBOOK_PAGE_ID not configured' }
  }

  try {
    const body: Record<string, string> = { message, access_token: token }
    if (link) body.link = link

    const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (data.id) {
      return {
        platform: 'facebook',
        success: true,
        postId: data.id,
        postUrl: `https://www.facebook.com/${data.id}`,
      }
    }
    return { platform: 'facebook', success: false, error: data.error?.message || 'Post failed' }
  } catch (err) {
    return { platform: 'facebook', success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── TikTok (Content Posting API v2) ───────────────────────

async function postToTikTok(
  caption: string,
  videoUrl?: string,
): Promise<SocialPostResult> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN

  if (!accessToken) {
    return { platform: 'tiktok', success: false, error: 'TIKTOK_ACCESS_TOKEN not configured' }
  }

  // TikTok Content Posting API requires video upload
  if (!videoUrl) {
    return { platform: 'tiktok', success: false, error: 'TikTok requires a video_url' }
  }

  try {
    // Initialize video upload
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.slice(0, 150),
          privacy_level: 'PUBLIC_TO_EVERYONE',
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: videoUrl,
        },
      }),
    })
    const initData = await initRes.json()

    if (initData.data?.publish_id) {
      return {
        platform: 'tiktok',
        success: true,
        postId: initData.data.publish_id,
        postUrl: `https://www.tiktok.com/@linapoint/video/${initData.data.publish_id}`,
      }
    }
    return { platform: 'tiktok', success: false, error: initData.error?.message || 'Upload init failed' }
  } catch (err) {
    return { platform: 'tiktok', success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── X / Twitter (v2 API) ──────────────────────────────────

async function postToX(
  text: string,
): Promise<SocialPostResult> {
  const bearerToken = process.env.X_BEARER_TOKEN

  if (!bearerToken) {
    return { platform: 'x', success: false, error: 'X_BEARER_TOKEN not configured' }
  }

  try {
    const res = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: text.slice(0, 280) }),
    })
    const data = await res.json()

    if (data.data?.id) {
      return {
        platform: 'x',
        success: true,
        postId: data.data.id,
        postUrl: `https://x.com/i/status/${data.data.id}`,
      }
    }
    return { platform: 'x', success: false, error: data.detail || data.title || 'Post failed' }
  } catch (err) {
    return { platform: 'x', success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── Unified post function ─────────────────────────────────

export async function publishToSocial(
  platform: string,
  content: string,
  mediaUrl?: string,
  link?: string,
): Promise<SocialPostResult> {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return postToInstagram(content, mediaUrl)
    case 'facebook':
      return postToFacebook(content, link)
    case 'tiktok':
      return postToTikTok(content, mediaUrl)
    case 'x':
    case 'twitter':
      return postToX(content)
    default:
      return { platform, success: false, error: `Unsupported platform: ${platform}` }
  }
}

/**
 * Post to multiple platforms. Returns results for each.
 */
export async function publishToAllPlatforms(
  platforms: string[],
  content: string,
  mediaUrl?: string,
  link?: string,
): Promise<SocialPostResult[]> {
  return Promise.all(platforms.map((p) => publishToSocial(p, content, mediaUrl, link)))
}
