import { fetchHTMLDocument } from "@hachi/html-scraper"

const IMDB_WEBSITE_URL = new URL("https://www.imdb.com/")

export type IMDBShow = {
  image?: string
  description?: string
  aggregateRating?: {
    ratingValue: number
  }
}

export async function fetchShow(showID: string): Promise<IMDBShow> {
  const endpoint = new URL(`title/${showID}`, IMDB_WEBSITE_URL)
  const html = await fetchHTMLDocument(endpoint)

  const json = html("head script[type='application/ld+json']").html()

  if (!json) {
    throw new Error(`Failed to parse data from IMDB: ${showID}`)
  }

  return JSON.parse(json) as IMDBShow
}
