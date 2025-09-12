import {fetchShowsFromArchive, type SCArchiveRequest, SCGenres} from "../api.ts";
import type {TeeviFeedCategory, TeeviFeedCollection} from "@teeviapp/core";
import {mapSCShowEntryToTeeviShowEntry} from "../mappers.ts";
import {mkdir} from "node:fs/promises";
import {dirname} from "node:path";

type CollectionRequest = {
    name: string
    type?: SCArchiveRequest["type"]
    genres?: SCArchiveRequest["genres"]
    year?: SCArchiveRequest["year"]
    service?: SCArchiveRequest["service"]
    minimumViews?: SCArchiveRequest["minimumViews"]
    sorting?: SCArchiveRequest["sorting"]
    category?: TeeviFeedCategory
    maximumPagesToFetch?: SCArchiveRequest["maximumPagesToFetch"]
}

const genreRequests: CollectionRequest[] = [
    {
        genres: [SCGenres.action],
        name: "Azione",
    },
    {
        genres: [SCGenres.crime],
        name: "Crimine",
    },
    {
        genres: [SCGenres.documentary],
        name: "Documentari",
    },
    {
        genres: [SCGenres.drama],
        name: "Dramma",
    },
    {
        genres: [SCGenres.family],
        name: "Famiglia",
    },
    {
        genres: [SCGenres.fantasy],
        name: "Fantasy",
    },
    {
        genres: [SCGenres.war],
        name: "Guerra",
    },
    {
        genres: [SCGenres.horror],
        name: "Horror",
    },
    {
        genres: [SCGenres.korean_drama],
        name: "Drammi Coreani",
    },
    {
        genres: [SCGenres.mystery],
        name: "Mistero",
    },
    {
        genres: [SCGenres.science_fiction],
        name: "Fantascienza",
    },
    {
        genres: [SCGenres.thriller],
        name: "Thriller",
    },
    {
        genres: [SCGenres.animation],
        name: "Animazione",
    },
    {
        genres: [SCGenres.comedy],
        name: "Commedia",
    },
    {
        genres: [SCGenres.action_adventure],
        name: "Azione e Avventura",
    },
    {
        genres: [SCGenres.musical],
        name: "Musical",
    },
    {
        genres: [SCGenres.romantic],
        name: "Romantico",
    },
    {
        genres: [SCGenres.animation, SCGenres.comedy],
        type: "tv",
        name: "Animazione esilarante",
        minimumViews: "75k",
    },
]

const topMoviesByYearRequests: CollectionRequest[] = [
    {
        type: "movie",
        year: 1990,
        name: "I migliori film degli anni 90",
    },
    {
        type: "movie",
        year: 1980,
        name: "I migliori film degli anni 80",
    },
    {
        type: "movie",
        year: 1970,
        name: "I migliori film degli anni 70",
    },
    {
        type: "movie",
        year: 1960,
        name: "I migliori film degli anni 60",
    },
]

const newSeriesRequests: CollectionRequest[] = [
    {
        type: "tv",
        service: "netflix",
        name: "Novità Netflix",
        sorting: "last_air_date",
        category: "new",
        maximumPagesToFetch: 1,
    },
    {
        type: "tv",
        service: "disney",
        name: "Novità Disney+",
        sorting: "last_air_date",
        category: "new",
        maximumPagesToFetch: 1,
    },
    {
        type: "tv",
        service: "prime",
        name: "Novità Prime Video",
        sorting: "last_air_date",
        category: "new",
        maximumPagesToFetch: 1,
    },
    {
        type: "tv",
        service: "apple",
        name: "Novità Apple TV+",
        sorting: "last_air_date",
        category: "new",
        maximumPagesToFetch: 1,
    },
    {
        type: "tv",
        service: "now",
        name: "Novità Now TV",
        sorting: "last_air_date",
        category: "new",
        maximumPagesToFetch: 1,
    },
]

const topRequests: CollectionRequest[] = [
    {
        type: "tv",
        minimumViews: "1M",
        name: "Serie da record",
        category: "hot",
    },
    {
        type: "movie",
        minimumViews: "500k",
        name: "Film da record",
        category: "hot",
    },
]

async function generateCollections() {
    async function write(data: any, path: string) {
        await mkdir(dirname(path), {recursive: true})
        if (typeof data !== "string") {
            data = JSON.stringify(data, null, 2)
        }

        await Bun.write(path, data)
    }

    const collections = []
    const requests: CollectionRequest[] = [
        ...genreRequests,
        ...newSeriesRequests,
        ...topMoviesByYearRequests,
        ...topRequests
    ]

    for (const request of requests) {
        const collection = await fetchCollection(request)
        collections.push(collection)
        console.log(
            `Fetched collection: ${request.type} ${request.name} (shows count: ${collection.shows.length})`
        )
        const delay = Math.floor(Math.random() * (3000 - 2000 + 1)) + 2000 // Random delay
        console.log(`Waiting ${delay / 1000} seconds...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
    }

    await write(collections, "assets/sc_feed_cache_collections.json")
}

async function fetchCollection(
    request: CollectionRequest
): Promise<TeeviFeedCollection> {
    const {minimumViews, sorting, maximumPagesToFetch, ...rest} = request
    const shows = await fetchShowsFromArchive({
        ...rest,
        sorting: sorting ?? "score",
        maximumPagesToFetch: maximumPagesToFetch ?? 2,
        minimumViews: minimumViews,
    })
   
    return {
        name: request.name,
        id: `hachi-sc-${request.type}-${request.name.toLowerCase().replace(/\s/g, "-")}`,
        category: request.category,
        shows: shows.map((show) => {
            return mapSCShowEntryToTeeviShowEntry(show)
        }),
    }
}

generateCollections()
