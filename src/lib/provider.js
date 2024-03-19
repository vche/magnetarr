import { ItemTypes } from './server';

class Provider {
    static get name() { return ""; }

    constructor (name) {
        this.name = Imdb.name;
	}
    
    urlMatch(url) { return false; }
    itemFromUrl(url) { return {itemid: 0, itemtype: ItemTypes.Unknown}; }
}

export class Imdb extends Provider {
    static get name() { return "Imdb";}

    constructor (name) {
        super(name);
        this.idRegex = new RegExp("\/tt\\d{1,8}");
        this.xmlparser = new DOMParser();
	}

    urlMatch(url) { return url.match(/\/\/www\.imdb.com\/.+\/tt\d{7,8}\//)?true:false; }

    imdbIdFromUrl(url) {
        const imdbid = this.idRegex.exec(url);
        return (imdbid) ? imdbid[0].slice(1) : "";
    }

    async tvdbidFromImdbid(imdbid) {
        const url = "http://thetvdb.com/api/GetSeriesByRemoteID.php?imdbid=" + imdbid;
        const headers = {"Content-Type": "application/xml"};
        try {
            // Try to get the serie id from allocine
            const res = await fetch(url, { method: "get", headers: headers });
            if (res.status >= 400) throw new Error(`${res.status} (${res.statusText})`)
            const xmldata = await res.text();
            console.debug(`Request to ${url}: ${res.status} ${xmldata}`); 

            // Extract the serie id from xml data if we got some
            const xmldoc = this.xmlparser.parseFromString(xmldata, "application/xml");
            const errorNode = xmldoc.querySelector("parsererror");
            if (errorNode) {
              console.log("error while parsing response: " + xmldata);
            } else {
                const serieid = xmldoc.getElementsByTagName("seriesid");
                if (serieid.length > 0) {
                    return serieid[0].innerHTML;
                }
            }
        } catch (error) {
            console.log(`Error querying endpoint ${url}: ${error}`);
        }
        return null;
    }

    async itemFromUrl(url) {
        const imdbid = this.imdbIdFromUrl(url);
        if (!imdbid) {
            return {itemid: null, itemtype: ItemTypes.Unknown}
        }

        const tvdbid = await this.tvdbidFromImdbid(imdbid)
        console.debug("imdb id " + imdbid + " // tvdb id " + tvdbid);

        // If we have a tvid, that's a serie. otherwise a movie
        if (tvdbid){
            return {itemid: tvdbid, itemtype: ItemTypes.Serie}
        }
        return {itemid: imdbid, itemtype: ItemTypes.Movie}
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

    urlMatch(url) { return url.match(/.*thetvdb.com\/.*id\=\d{1,7}/)?true:false; }

    // tvdbIdFromUrl(url) {}
    // var regex = new RegExp("(&|\\?)(id|seriesid)=\\d{1,7}");
    // var tvdbid = regex.exec(url);
    // return (tvdbid) ? tvdbid[0].split("=")[1]:"";
}

export class RottenTomatoes extends Provider {
    static get name() { return "RottenTomatoes";}

    urlMatch(url) { return url.match(/.*rottentomatoes.com\/(tv|m)\//)?true:false; }
}

export class TheMovieDb extends Provider {
    static get name() { return "TheMovieDb";}

    urlMatch(url) { return url.match(/.*themoviedb.org\/(tv|movie)\//)?true:false; }
}

export class TraktTv extends Provider {
    static get name() { return "TraktTv";}

    urlMatch(url) { return url.match(/.*trakt.tv\/(shows|movies)\//)?true:false; }
}

// Build the list of available providers
const ProviderList = {};
ProviderList[Imdb.name] = new Imdb();
// ProviderList[Tvdb.name] = new Tvdb();
// ProviderList[RottenTomatoes.name] = new RottenTomatoes();
// ProviderList[TheMovieDb.name] = new TheMovieDb();
// ProviderList[TraktTv.name] = new TraktTv();

// Find a provider matching this url
export function getProviderFromUrl(url) {
    for (const [name, provider] of Object.entries(ProviderList)) {
        if (provider.urlMatch(url)) { return provider; }
    }
    return null;
}
