/**
 * Tour Scout Agent — Scrapes tour/experience prices from Viator,
 * GetYourGuide, and TripAdvisor via Tavily search API.
 * Calculates "beat by 6%" pricing for our direct-booking tours.
 */

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || ''

const PLATFORMS = [
  { name: 'viator', domain: 'viator.com' },
  { name: 'getyourguide', domain: 'getyourguide.com' },
  { name: 'tripadvisor', domain: 'tripadvisor.com' },
]

export interface TourOTAPrice {
  platform: string
  otaName: string
  otaUrl: string
  otaPrice: number
  otaRating: number | null
  ourPrice: number // otaPrice * 0.94
  source: 'live' | 'fallback'
}

/**
 * Scrape prices for a single tour across all 3 platforms.
 */
export async function scrapeTourPrices(
  tourName: string,
  location: string = 'San Pedro Belize',
): Promise<TourOTAPrice[]> {
  if (!TAVILY_API_KEY) {
    console.warn('[TourScout] No TAVILY_API_KEY set')
    return []
  }

  const query = `"${tourName}" tour ${location} price site:viator.com OR site:getyourguide.com OR site:tripadvisor.com`

  const prices: TourOTAPrice[] = []

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'advanced',
        max_results: 10,
        include_answer: true,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      console.warn(`[TourScout] Tavily returned ${response.status}`)
      return []
    }

    const data = await response.json()
    const results: Array<{ url: string; content: string; title: string }> = data.results || []

    for (const result of results) {
      // Match to a platform
      const platform = PLATFORMS.find(p => result.url.includes(p.domain))
      if (!platform) continue
      if (prices.some(p => p.platform === platform.name)) continue // one per platform

      // Extract price
      const priceMatches = result.content.match(/\$\s?(\d{2,4}(?:\.\d{2})?)/g)
      if (!priceMatches) continue

      let bestPrice: number | null = null
      for (const match of priceMatches) {
        const amount = parseFloat(match.replace('$', '').replace(/\s/g, ''))
        if (amount >= 10 && amount <= 2000) {
          bestPrice = amount
          break
        }
      }
      if (!bestPrice) continue

      // Extract rating (e.g. "4.5 out of 5", "4.5/5", "★ 4.5")
      const ratingMatch = result.content.match(/(\d\.\d)\s*(?:out of 5|\/5|stars?)/i)
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

      prices.push({
        platform: platform.name,
        otaName: result.title.slice(0, 100),
        otaUrl: result.url,
        otaPrice: bestPrice,
        otaRating: rating,
        ourPrice: Math.round(bestPrice * 0.94 * 100) / 100,
        source: 'live',
      })
    }
  } catch (err) {
    console.error('[TourScout] Search failed:', err instanceof Error ? err.message : err)
  }

  return prices
}

/**
 * Scrape prices for all active tours from the database.
 * Returns a map of tourId → prices.
 */
export async function scrapeAllTourPrices(
  tours: Array<{ id: string; name: string; location?: string }>,
): Promise<Map<string, TourOTAPrice[]>> {
  const results = new Map<string, TourOTAPrice[]>()

  for (const tour of tours) {
    try {
      const prices = await scrapeTourPrices(tour.name, tour.location || 'San Pedro Belize')
      results.set(tour.id, prices)

      // Small delay between tours to be respectful to Tavily rate limits
      if (tours.indexOf(tour) < tours.length - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (err) {
      console.error(`[TourScout] Failed to scrape ${tour.name}:`, err)
      results.set(tour.id, [])
    }
  }

  return results
}
