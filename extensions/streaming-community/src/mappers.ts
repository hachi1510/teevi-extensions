import type {TeeviShow, TeeviShowEntry, TeeviShowEpisode, TeeviShowStatus,} from "@teeviapp/core"
import {findImageURL, type SCEpisode, type SCShow, type SCShowEntry,} from "./api"

export function mapSCShowEntryToTeeviShowEntry(
    show: SCShowEntry
): TeeviShowEntry {
    return {
        kind: show.type == "movie" ? "movie" : "series",
        id: `${show.id}-${show.slug}`,
        title: show.name,
        posterURL: findImageURL(show.images, "poster"),
        year: new Date(show.last_air_date).getFullYear(),
        language: "it",
    } satisfies TeeviShowEntry
}

export function mapSCEpisodeToTeeviShowEpisode(
    showId: string,
    episode: SCEpisode
): TeeviShowEpisode {
    return {
        id: `${showId}?episode_id=${episode.id}`,
        number: episode.number,
        overview: episode.plot,
        title: episode.name,
        duration: (episode.duration || 0) * 60,
        thumbnailURL: findImageURL(episode.images, "cover"),
    } satisfies TeeviShowEpisode
}

export function mapSCShowStatusToTeeviShowStatus(
    scStatus?: string
): TeeviShowStatus | undefined {
    if (!scStatus) return undefined
    const status = scStatus.toLowerCase()
    if (
        [
            "in production",
            "post production",
            "planned",
            "pilot",
            "rumored",
            "announced",
        ].includes(status)
    ) {
        return "upcoming"
    }

    if (status === "returning series") return "airing"
    if (status === "canceled") return "canceled"

    if (status === "released" || status === "ended") return "ended"

    return undefined
}

export function mapSCShowToTeeviShow(id: string, show: SCShow): TeeviShow {
    const isSeries = show.type !== "movie"
    const rating =
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
        posterURL: findImageURL(show.images, "poster"),
        backdropURL:
            findImageURL(show.images, "background") ||
            findImageURL(show.images, "cover_mobile") ||
            findImageURL(show.images, "cover"),
        logoURL: findImageURL(show.images, "logo"),
        rating: rating,
        status: mapSCShowStatusToTeeviShowStatus(show.status),
        relatedShows: show.related?.map((relatedShow) =>
            mapSCShowEntryToTeeviShowEntry(relatedShow)
        ),
        language: "it",
    }
}
