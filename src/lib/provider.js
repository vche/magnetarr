import { Item, ItemTypes } from './server';

class CliApi {
    constructor () {
        this.api_key = null
        this.login_url = null;
        this.token = null;

        // DOMParser is not available in service worker (but we don't need it). so catch the error
        this.xmlparser = null;
        try { this.xmlparser = new DOMParser(); }
        catch (error) { console.debug("Service worker, ignoring DOMParser unavailability"); }
    }

    async login() {
        if (this.login_url) {
            const res = await this.request(this.login_url, false, "post", {"apikey": this.api_key}, true);
            try {
                this.token = res.data.token;
            } catch (error) {
                console.log(`Error logging to tvdb api: ${error}`);
            }
        }
        else console.log("Can't login, no login url specified")
    }

    async getToken() {
        if (!this.token) await this.login()
        return this.token;
    }

    // Send a request to the tvdb api using the specified method.
    // Uses json by default unless legacy is specified, then an xml dom is returned
    // If login is set to true, no authentication is token is sent
    async request(url, legacy=false, method="get", data=null, login=false) {
        const datatype = "application/" + (legacy?"xml":"json");
        const headers = {
            "Content-Type": datatype,
            "accept": datatype
        };
        const body = data?JSON.stringify(data):null;

        if (!login && !legacy ) {
            const token = await this.getToken();
            headers["Authorization"] = "Bearer " + token;
        }

        if (legacy && (!this.xmlparser)) return null;
        try {
            console.debug(`Request to ${url}, hdr: ${headers}`); 
            const res = await fetch(url, { method: method, headers: headers, body: body });
            if (res.status >= 400) throw new Error(`${res.status} (${res.statusText})`)
            if (legacy) {
                const xmldata = await res.text();
                console.debug(`Response: ${xmldata}`); 

                // Extract the serie id from xml data if we got some
                const xmldoc = this.xmlparser.parseFromString(xmldata, "application/xml");
                const errorNode = xmldoc.querySelector("parsererror");
                if (errorNode) {
                    console.log("error while parsing response: " + xmldata);
                } else {
                    return xmldoc;
                }
            }
            else {
                const jsondata = await res.json();
                console.debug(jsondata); 
                return jsondata;
            }
        } catch (error) {
            console.log(`Error querying endpoint ${url}: ${error}`);
        }
        return null;
    }
}

class TvdbApi extends CliApi {
    // Query the tvdp api
    // Legacy api https://github.com/lertify/thetvdb-api/
    // API v4: https://thetvdb.github.io/v4-api

    constructor () {
        super();
        this.api_key = "538d3d06-3679-417e-8d2c-594c1b107b6b"
        this.login_url = 'https://api4.thetvdb.com/v4/login';
        this.token = null;
    }
}

class TmdbApi extends CliApi {
    // Query the tmdp api
    // API v3: https://developer.themoviedb.org/docs/authentication-application

    constructor () {
        super();
        this.token = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI4N2RiMTBlODg3N2VkNzllZjViYzg4NzNhNGMzYjZjNyIsInN1YiI6IjY2MTQ2ODNiNTkwMDg2MDE4NTdlMjc2NiIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.6gU-SMaHYKUG0VnWdVx0ev9x8efiSbQIzWFgS46aMGk";
    }
}

class Provider {
    static get name() { return ""; }

    constructor (name, tvdbcli=null, tmdbapi=null) {
        this.name = name;
        this.tvdbapi = tvdbcli?tvdbcli:new TvdbApi();
        this.tmdbapi = tmdbapi?tmdbapi:new TmdbApi();
	}
    
    // Needs overwriting from child classes
    urlMatch(url) { return false; }
    itemFromUrl(url) { return new Item(); }

    // Get the item from this imdb id, or null if can't get it. tvdb api is used, fallabck to v1 upon failure
    async itemFromImdbId(imdbid) {
        if (!imdbid) { return null; }
        var item = null;

        // Try tvdb api v4
        var url = "https://api4.thetvdb.com/v4/search/remoteid/" + imdbid;
        const jsondoc = await this.tvdbapi.request(url);
        if (jsondoc && jsondoc.data) {
            const found = jsondoc.data[0];
            if ("series" in found) {
                item = new Item(ItemTypes.Serie, imdbid, found.series.id)
            }
            else if ("movie" in found) {
                item = new Item(ItemTypes.Movie, imdbid, found.movie.id)
            }
            else { console.log("Error, no item type found in :"); console.log(found) }
        }

        // This is only fallback if apiv4 failed
        if (!item) {
            console.log("Failed to get info using V4 API, Falling back on TVDB API v1")
            url = "http://thetvdb.com/api/GetSeriesByRemoteID.php?imdbid=" + imdbid;
            const xmldoc = await this.tvdbapi.request(url, true);
            if (xmldoc) {
                const serieid = xmldoc.getElementsByTagName("seriesid");
                if (serieid.length > 0) {
                    item = new Item(ItemTypes.Serie, imdbid, serieid[0].innerHTML)
                    item.tvdbid = serieid[0].innerHTML;
                }
            }
            // if the fallback doesn't find the show, assume it's a movie since we have an imdb id
            if (!item) { item = new Item(ItemTypes.Movie, imdbid, null) }
            item.imdbid = imdbid;
        }
        return item;    
    }

    _getRemoteId(remote_ids, source_name) {
        for (var i = 0; i < remote_ids.length; i++) {
            if (remote_ids[i].sourceName === source_name) return remote_ids[i].id;
        }
        return null;
    }

    // Get the item ids from slug
    async itemFromTvdbSlug(type, slug) {        
        var api_path = null;
        var item = null;

        if (type && slug) {
            if (type == ItemTypes.Movie) { api_path = "movies"; }
            else if (type == ItemTypes.Serie) { api_path = "series"; }
        }

        if (api_path) {
            // Get the tvdb id from slug
            const url = `https://api4.thetvdb.com/v4/${api_path}/slug/${slug}`;
            const jsondoc = await this.tvdbapi.request(url);
            if (jsondoc && jsondoc.data) {
                var imdbid = null;
                // get the imdb id from tvdb id
                const extended_url = `https://api4.thetvdb.com/v4/${api_path}/${jsondoc.data.id}/extended`
                const extended_jsondoc = await this.tvdbapi.request(extended_url);
                if (extended_jsondoc && extended_jsondoc.data.remoteIds) {
                    imdbid = this._getRemoteId(extended_jsondoc.data.remoteIds, "IMDB");
                }
                item = new Item(type, imdbid, jsondoc.data.id)                
            }
        }
        return item;
    }

    // Get the item ids from tmdb id
    async itemFromTmdbId(type, tmdbid) {        
        var api_path = null;
        var item = null;

        if (type && tmdbid) {
            if (type == ItemTypes.Movie) { api_path = "movie"; }
            else if (type == ItemTypes.Serie) { api_path = "tv"; }
        }

        if (api_path) {
            // Get the imdb id from tmdbid
            const url = `https://api.themoviedb.org/3/${api_path}/${tmdbid}/external_ids`;
            const jsondoc = await this.tmdbapi.request(url);
            if (jsondoc) {
                item = new Item(type, jsondoc.imdb_id, jsondoc.tvdb_id)
            }
        }
        return item;
    }
}

export class Imdb extends Provider {
    static get name() { return "Imdb";}

    constructor (tvdbapi=null, tmdbapi=null) {
        super(Imdb.name, tvdbapi, tmdbapi);
        this.idRegex = new RegExp("\/tt\\d{1,8}");
	}

    _imdbIdFromUrl(url) {
        const imdbid = this.idRegex.exec(url);
        return (imdbid) ? imdbid[0].slice(1) : "";
    }

    urlMatch(url) { return url.match(/\/\/www\.imdb.com\/.+\/tt\d{7,8}\//)?true:false; }

    async itemFromUrl(url) {
        const imdbid = this._imdbIdFromUrl(url);
        const item = await this.itemFromImdbId(imdbid);
        return (item) ? item : new Item();
    }

    // async ImdbidFromTitle(title,ismovie) {
	// 	if (ismovie){
	// 		var url = "http://www.imdb.com/find?s=tt&ttype=ft&ref_=fn_ft&q=" + title;
	// 	} else {
	// 		var url = "http://www.imdb.com/find?s=tt&&ttype=tv&ref_=fn_tv&q=" + title;
	// 	}
	// 	let result = await $.ajax({url: url, datatype: "xml"});
	// 	var regex = new RegExp("\/tt\\d{1,8}");
	// 	let imdbid = await regex.exec($(result).find(".result_text").find("a").attr("href"));

	// 	return (imdbid) ? imdbid[0].slice(1) : "";

	// }
        // try {
        //     let imdbid = pulsarr.extractIMDBID(url);
        //     let tvdbid = await pulsarr.TvdbidFromImdbid(imdbid);
        //     console.log("Extracted imdb id " + imdbid + " tvdbid " + tvdbid);
    
        //     Promise.all([radarr.lookupMovie(imdbid, tvdbid), sonarr.lookupSeries(tvdbid)]).then(function(error) {
        //         if (pulsarrConfig.radarr.isEnabled && pulsarrConfig.sonarr.isEnabled) {
        //             pulsarr.info(error);
        //         } else if (pulsarrConfig.radarr.isEnabled && !pulsarrConfig.sonarr.isEnabled) {
        //             pulsarr.init(blackhole);
        //             $('#optLgConfig').removeClass("hidden");
        //             pulsarr.info("Unable to find movie. If this is a series, please configure a Sonarr server.");
        //         } else if (!pulsarrConfig.radarr.isEnabled && pulsarrConfig.sonarr.isEnabled) {
        //             pulsarr.init(blackhole);
        //             $('#optLgConfig').removeClass("hidden");
        //             pulsarr.info("Unable to find series. If this is a movie, please configure a Radarr server.");
        //         } else {
        //             chrome.runtime.openOptionsPage();
        //         }
        //     }).catch(function(response) {
        //         pulsarr.init(response);
        //     });
        // } catch (err) {
        //     pulsarr.info(err);
        // }

    //     return true; 
    // }
}

export class Tvdb extends Provider {
    static get name() { return "Tvdb";}

    constructor (tvdbapi=null, tmdbapi=null) {
        super(Tvdb.name, tvdbapi, tmdbapi);
        this.idRegex = new RegExp("\/(?<type>movies|series)\/(?<slug>.*)");
	}

    _typeSlugFromUrl(url) {
        const result = this.idRegex.exec(url);
        if (result && result.groups) {
            const found = result.groups;
            found.type = (found.type == "movies") ? ItemTypes.Movie : ((found.type == "series") ? ItemTypes.Serie: null);
            return found;
        }
        return {"type": null, "slug": null};
    }

    urlMatch(url) { 
        return url.match(/.*thetvdb.com\/(movies|series)\/.*/)?true:false; 
    }

    async itemFromUrl(url) {
        const type_slug = this._typeSlugFromUrl(url);
        const item = await this.itemFromTvdbSlug(type_slug.type, type_slug.slug)
        return (item) ? item : new Item();
    }
}

export class TheMovieDb extends Provider {
    static get name() { return "TheMovieDb";}

    constructor (tvdbapi=null, tmdbapi=null) {
        super(TheMovieDb.name, tvdbapi, tmdbapi);
        this.idRegex = new RegExp("\/(?<type>movie|tv)\/(?<tmdbid>\\d*)");
	}

    _typeIdFromUrl(url) {
        const result = this.idRegex.exec(url);
        if (result && result.groups) {
            const found = result.groups;
            found.type = (found.type == "movie") ? ItemTypes.Movie : ((found.type == "tv") ? ItemTypes.Serie: null);
            return found;
        }
        return {"type": null, "tmdbid": null};
    }

    // https://www.themoviedb.org/movie/693134-dune-part-two
    // https://www.themoviedb.org/tv/1402-the-walking-dead
    urlMatch(url) { return url.match(/.*themoviedb.org\/(tv|movie)\//)?true:false; }

    async itemFromUrl(url) {
        const type_id = this._typeIdFromUrl(url);
        const item = await this.itemFromTmdbId(type_id.type, type_id.tmdbid)
        return (item) ? item : new Item();
    }
}

export class TraktTv extends Provider {
    static get name() { return "TraktTv";}

    urlMatch(url) { return url.match(/.*trakt.tv\/(shows|movies)\//)?true:false; }

    // let loadFromTraktUrl = async (url) => {
    //     var regextv = new RegExp("trakt.tv\/shows\/");
    //     var regexmov = new RegExp("trakt.tv\/movies\/");
    //     if (regextv.test(url)) {
    //         $.ajax({
    //             url : url,
    //             success : function(result) {sonarr.lookupSeries(pulsarr.extractTVDBID(result)).then(function(error) {
    //                 pulsarr.info(error);
    //             }).catch(function(response) {
    //                 pulsarr.init(response);
    //             });}
    //         });
    //     } else if (regexmov.test(url)) {
    //         $.ajax({
    //             url : url,
    //             success : function(result) {radarr.lookupMovie(pulsarr.extractIMDBID(result)).then(function(error) {
    //                 pulsarr.info(error);
    //             }).catch(function(response) {
    //                 pulsarr.init(response);
    //             });}
    //         });
    //     } else {
    //         pulsarr.info("Could not find media. Are you on a valid TV Show or Movie page?");
    //     }
    // }
}

// Build the list of available providers
const tvdbapi = new TvdbApi();
const tmdbapi = new TmdbApi();
const ProviderList = {};
ProviderList[Imdb.name] = new Imdb(tvdbapi, tmdbapi);
ProviderList[Tvdb.name] = new Tvdb(tvdbapi, tmdbapi);
ProviderList[TheMovieDb.name] = new TheMovieDb(tvdbapi, tmdbapi);
// ProviderList[TraktTv.name] = new TraktTv();

// Find a provider matching this url
export function getProviderFromUrl(url) {
    for (const [name, provider] of Object.entries(ProviderList)) {
        if (provider.urlMatch(url)) { return provider; }
    }

    return null;
}
