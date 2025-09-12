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
} from "./api"
import {fetchShow as imdbFetchShow, type IMDBShow,} from "./data-providers/imdb"
import {fetchShow as tmdbFetchShow, type TMDBShow,} from "./data-providers/tmdb"
import {mapSCEpisodeToTeeviShowEpisode, mapSCShowEntryToTeeviShowEntry, mapSCShowToTeeviShow,} from "./mappers"
import collections from "../assets/feed_collections_cache.json"
import trendingShows from "../assets/feed_trending_shows_cache.json"

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
    teeviShow.backdropURL = tmdbShow?.backdrop || teeviShow.backdropURL
    teeviShow.logoURL = tmdbShow?.logo || teeviShow.logoURL

    return teeviShow
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
    return trendingShows as TeeviShow[]
}

export default {
    fetchShowsByQuery,
    fetchShow,
    fetchEpisodes,
    fetchVideoAssets,
    fetchFeedCollections,
    fetchTrendingShows,
} satisfies TeeviMetadataExtension & TeeviVideoExtension & TeeviFeedExtension
