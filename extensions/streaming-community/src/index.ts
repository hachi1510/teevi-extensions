import type {
    TeeviFeedCollection,
    TeeviFeedExtension,
    TeeviMetadataExtension,
    TeeviShow,
    TeeviShowEntry,
    TeeviShowEpisode,
    TeeviVideoAsset,
    TeeviVideoExtension,
} from "@teeviapp/core"
import {
    fetchEpisodes as scFetchEpisodes,
    fetchShow as scFetchShow,
    fetchShowsByQuery as scFetchShowsByQuery,
    fetchVideoAsset as scFetchVideoAsset,
    findImageURL as scFindImageURL,
} from "./api"
import {fetchShow as imdbFetchShow, type IMDBShow,} from "./data-providers/imdb"
import {fetchShow as tmdbFetchShow, type TMDBShow,} from "./data-providers/tmdb"
import {
    mapSCEpisodeToTeeviShowEpisode,
    mapSCShowEntryToTeeviShowEntry,
    mapSCShowStatusToTeeviShowStatus,
    mapSCShowToTeeviShow,
} from "./mappers"
import collections from "../assets/sc_feed_cache_collections.json"
import trendings from "../assets/sc_feed_cache_trending_shows.json"

async function fetchShowsByQuery(query: string): Promise<TeeviShowEntry[]> {
    const shows = await scFetchShowsByQuery(query)
    return shows.map((show) => mapSCShowEntryToTeeviShowEntry(show))
}

async function fetchShow(id: string): Promise<TeeviShow> {
    const show = await scFetchShow(id)
    const teeviShow = mapSCShowToTeeviShow(id, show)

    let tmdbShow: TMDBShow | undefined
    let imdbShow: IMDBShow | undefined

    try {
        if (show.tmdb_id) {
            tmdbShow = await tmdbFetchShow({id: show.tmdb_id, kind: show.type})
        } else if (show.imdb_id) {
            imdbShow = await imdbFetchShow(show.imdb_id)
        }
    } catch (error) {
        console.error(`Failed to fetch additional data: ${error}`)
    }

    teeviShow.posterURL =
        tmdbShow?.poster || imdbShow?.image || teeviShow.posterURL

    const isSeries = show.type !== "movie"

    const posterURL =
        tmdbShow?.poster || imdbShow?.image || scFindImageURL(show.images, "poster")

    const backdropURL =
        tmdbShow?.backdrop ||
        scFindImageURL(show.images, "background") ||
        scFindImageURL(show.images, "cover_mobile") ||
        scFindImageURL(show.images, "cover")

    const logoURL = tmdbShow?.logo || scFindImageURL(show.images, "logo")

    let rating =
        typeof show.score === "string" ? parseFloat(show.score) : show.score

    const seasons = show.seasons?.map((s) => ({
        number: s.number,
        name: s.name,
    }))

    return {
        id,
        kind: isSeries ? "series" : "movie",
        title: show.name,
        overview: show.plot,
        genres: show.genres.map((g) => g.name),
        duration: (show.runtime || 0) * 60,
        releaseDate: show.release_date,
        seasons: isSeries ? seasons : undefined,
        posterURL: posterURL,
        backdropURL: backdropURL,
        logoURL: logoURL,
        rating: rating,
        status: mapSCShowStatusToTeeviShowStatus(show.status),
        relatedShows: show.related?.map((relatedShow) =>
            mapSCShowEntryToTeeviShowEntry(relatedShow)
        ),
        language: "it",
    }
}

async function fetchEpisodes(
    id: string,
    season: number
): Promise<TeeviShowEpisode[]> {
    const [showId] = id.split("-")
    const episodes = await scFetchEpisodes(id, season)

    return episodes.map((episode) => {
        return mapSCEpisodeToTeeviShowEpisode(showId, episode)
    })
}

async function fetchVideoAssets(id: string): Promise<TeeviVideoAsset[]> {
    const videoAsset = await scFetchVideoAsset(id)
    const headers: Record<string, string> = {
        Referer: videoAsset.referer,
    }

    if (globalThis.Teevi?.userAgent) {
        headers["User-Agent"] = globalThis.Teevi.userAgent
    }

    return [{url: videoAsset.url, headers}]
}

async function fetchFeedCollections(): Promise<TeeviFeedCollection[]> {
    return collections as TeeviFeedCollection[]
}

async function fetchTrendingShows(): Promise<TeeviShow[]> {
    return trendings as TeeviShow[]
}

export default {
    fetchShowsByQuery,
    fetchShow,
    fetchEpisodes,
    fetchVideoAssets,
    fetchFeedCollections,
    fetchTrendingShows,
} satisfies TeeviMetadataExtension & TeeviVideoExtension & TeeviFeedExtension
