import {type TeeviShow} from "@teeviapp/core"
import {mkdir} from "fs/promises"
import {dirname} from "node:path";
import {fetchShow, fetchShowsFromArchive} from "../api.ts";
import {mapSCShowEntryToTeeviShowEntry, mapSCShowToTeeviShow} from "../mappers.ts";
import {fetchImages} from "../data-providers/tmdb.ts";

async function generateTrends() {
    async function write(data: any, path: string) {
        await mkdir(dirname(path), {recursive: true})
        if (typeof data !== "string") {
            data = JSON.stringify(data, null, 2)
        }
        await Bun.write(path, data)
    }

    const shows = await fetchShowsFromArchive({
        sorting: "last_air_date",
        minimumViews: "100k",
        maximumPagesToFetch: 1
    })

    const trending: TeeviShow[] = []

    for (const show of shows.slice(0, 8).map(show => mapSCShowEntryToTeeviShowEntry(show))) {
        const scShow = await fetchShow(show.id)
        const {relatedShows, ...teeviShow} = mapSCShowToTeeviShow(show.id, scShow)
        if (scShow.tmdb_id) {
            const posters = await fetchImages({kind: scShow.type, id: scShow.tmdb_id, type: "posters", language: "xx"})
            if (posters.length > 0) {
                teeviShow.posterURL = posters[0]
                trending.push(teeviShow)
            }
        }
    }

    await write(trending, "assets/sc_feed_cache_trending_shows.json")
}

generateTrends()