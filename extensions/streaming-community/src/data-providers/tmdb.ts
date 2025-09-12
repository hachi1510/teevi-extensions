import {fetchHTMLDocument} from "@hachi/html-scraper"

const TMDB_WEBSITE_URL = new URL("https://www.themoviedb.org/")

// TMDB image resolutions
const POSTER_MEDIUM_RESOLUTION = "w780"
const BACKDROP_MEDIUM_RESOLUTION = "w1280"
const LOGO_MEDIUM_RESOLUTION = "w500"

export type TMDBShow = {
    title: string
    description: string
    poster?: string
    backdrop?: string
    logo?: string
}

export type TMDBKind = "movie" | "tv"

export async function fetchShow(options: {
    kind: TMDBKind
    id: number
}): Promise<TMDBShow> {
    const primaryLanguage = "it"
    const fallbackLanguage = "en"

    try {
        let posterURL: string | undefined
        let backdropURL: string | undefined
        let logoURL: string | undefined

        const primaryShowData = await extractShowDataFromHTML({
            ...options,
            language: primaryLanguage,
        })

        posterURL = primaryShowData.poster
        backdropURL = primaryShowData.backdrop
        logoURL = primaryShowData.logo

        // If primary data is not available, fallback to another language data
        if (!posterURL || !backdropURL || !logoURL) {
            const fallbackShowData = await extractShowDataFromHTML({
                ...options,
                language: fallbackLanguage,
            })

            // Use fallback data only if primary data is missing
            posterURL = posterURL || fallbackShowData.poster
            backdropURL = backdropURL || fallbackShowData.backdrop
            logoURL = logoURL || fallbackShowData.logo
        }

        posterURL = posterURL
            ? updateResolutionInUrl(posterURL, POSTER_MEDIUM_RESOLUTION)
            : undefined

        backdropURL = backdropURL
            ? updateResolutionInUrl(backdropURL, BACKDROP_MEDIUM_RESOLUTION)
            : undefined

        logoURL = logoURL
            ? updateResolutionInUrl(logoURL, LOGO_MEDIUM_RESOLUTION)
            : undefined

        return {
            title: primaryShowData.title || "",
            description: primaryShowData.description || "",
            poster: posterURL,
            backdrop: backdropURL,
            logo: logoURL,
        }
    } catch (error) {
        console.error("Error fetching show data:", error)
        throw new Error("Failed to fetch show data")
    }
}

async function extractShowDataFromHTML(options: {
    kind: TMDBKind
    id: number
    language: string
}) {
    const {kind, id, language} = options
    const url = new URL(`${kind}/${id}/images/logos`, TMDB_WEBSITE_URL)
    url.searchParams.append("language", language)
    url.searchParams.append("image_language", language)

    const html = await fetchHTMLDocument(url, {referer: "https://google.com"})

    return html.extract({
        title: {
            selector: "head meta[property='og:title']",
            value: "content",
        },
        description: {
            selector: "head meta[property='og:description']",
            value: "content",
        },
        poster: {
            selector: "head meta[property='og:image']:eq(0)",
            value: (el) => {
                const content = html(el).attr("content")
                return content ? sanitizeTMDBImageUrl(content) : undefined
            },
        },
        backdrop: {
            selector: "head meta[property='og:image']:eq(1)",
            value: (el) => {
                const content = html(el).attr("content")
                return content ? sanitizeTMDBImageUrl(content) : undefined
            },
        },
        logo: {
            selector: "ul.images.logos li a.image[href$='.png' i]",
            value: "href",
        },
    })
}

export async function fetchImages(options: {
    kind: TMDBKind
    id: number
    type: "logos" | "posters"
    language: string
}): Promise<string[]> {
    const {kind, id, language, type} = options
    const url = new URL(`${kind}/${id}/images/${type}`, TMDB_WEBSITE_URL)
    url.searchParams.append("image_language", language)
    const html = await fetchHTMLDocument(url, {referer: "https://google.com"})

    let resolution: string = POSTER_MEDIUM_RESOLUTION
    switch (type) {
        case "posters":
            resolution = POSTER_MEDIUM_RESOLUTION
            break
        case "logos":
            resolution = LOGO_MEDIUM_RESOLUTION
            break
    }

    const images = html("ul.images li div.image_content a")
    const hrefs = images.map((_, el) => html(el).attr("href")).get();
    return hrefs
        .filter(url => !url.endsWith(".svg"))
        .map((item) =>
            updateResolutionInUrl(item, resolution)
        )
}


function sanitizeTMDBImageUrl(url: string): string {
    return url.startsWith("https://media.themoviedb.org")
        ? url.replace("https://media.themoviedb.org", "https://image.tmdb.org")
        : url
}

function updateResolutionInUrl(url: string, newResolution: string): string {
    const parsed = new URL(url)
    const parts = parsed.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return url
    // Se la resolution corrente (penultimo segmento) è uguale a newResolution, restituisci l'url originale.
    if (parts[parts.length - 2] === newResolution) return url
    // Sostituisci il penultimo segmento con newResolution
    parts[parts.length - 2] = newResolution
    parsed.pathname = `/${parts.join("/")}`
    return parsed.toString()
}
