import { lookupService } from "dns";

export const ItemTypes = {
    Unknown: null,
	Movie: "movie",
	Serie: "serie",
}

export class Item {
    constructor(itemid=null, itemtype=ItemTypes.Unknown, itemslug = null, exists = null, properties = {})
    {
        this.provider = null;
        this.server = null;

        this.itemid = itemid;
        this.itemtype = itemtype;
        this.itemslug = itemslug;
        this.properties = properties;
        this.exists = exists;
    }

    getPosterUrl() {
        if (this.properties && this.properties.images) {
            for (var i = 0; i < this.properties.images.length; i++) {
                if (this.properties.images[i].coverType === "poster") {
                    return this.properties.images[i].remoteUrl;
                 }
            }
        }
    }
}

export class Server {
	constructor (name, default_port=0) {
		this.name = name;
		this.default_port = default_port;
        this.setConfig();
	}

    // Configure server from config dictionary
    setConfig(server_settings = null) {
        // Create empty config if neede
        if (server_settings == null) server_settings = {configuration: {auth: {}}, preferences: {}};
        else {
            if (server_settings.configuration === undefined) server_settings["configuration"] = {auth: {}};
            else if (server_settings.configuration.auth === undefined) server_settings.configuration["auth"] = {};
            if (server_settings.preferences === undefined) server_settings["preferences"] = {};
        }

        // Set properties or use default
        this.enabled = server_settings.enabled || false;

        // Set server configuration
        this.host = server_settings.configuration.host || "http://127.0.0.1";
        this.port = server_settings.configuration.port || this.default_port;
        this.apikey = server_settings.configuration.apikey || "" ;
        this.user = server_settings.configuration.auth.user || "" ;
        this.password = server_settings.configuration.auth.password || "" ;

        // Set server preferences
        this.monitored = server_settings.preferences.monitored || true ;
        this.profileid = server_settings.preferences.qualityProfileId || "" ;
        this.auxinfo = server_settings.preferences.auxInfo || "" ;
        this.folder = server_settings.preferences.folder || "" ;
        this.profiles = [];
        this.folders = [];
    }

    // Get the server config dictionary
    getConfig() {
	    return {
		    "enabled": this.enabled,
            "configuration": {
                "host": this.host,
                "port": this.port,
                "apikey": this.apikey,
                "auth": {
                    "user": this.user,
                    "pass": this.password,
                }
            },
		    "preferences": {
			    "monitored": this.monitored,
			    "qualityProfileId": this.profileid,
			    "auxInfo": this.auxinfo, // min availability for movies, series type for series
			    "folder": this.folder,
            },
        }
    }

    // Load the config from the extension storage
    async loadConfig(loadProfiles=false, loadFolders=false) {
        const wanted = {}
        wanted[this.name] = this.getConfig()
        const items = await chrome.storage.sync.get(wanted);

        this.setConfig(items[this.name]);
        console.debug(`Loaded ${this.name} config: ${JSON.stringify(this.getConfig())}`);

        if (loadProfiles) { this.profiles = await this.getProfiles(); }
        if (loadFolders) { this.folders = await this.getFolders(); }

        return items;
    }

    // Save config to the extension storage
    async saveConfig() {
        const wanted = {}
        wanted[this.name] = this.getConfig()
        console.debug(`Saved ${this.name} config: ${JSON.stringify(this.getConfig())}`);
        await chrome.storage.sync.set(wanted);
    }

    // Build the server url
    getUrl() {
		var regex = new RegExp("https{0,1}:\/\/");

		if (!regex.exec(this.host)) {
			this.host = "http://" + this.host;
		}
		if (this.port === "") {
			return this.host;
		} else {
			return this.host + ":" + this.port;
		}
	}

    async get(endpoint, data=null, params=null) { return await this.request("get", endpoint, data, params); }
    async post(endpoint, data=null, params=null) { return await this.request("post", endpoint, data, params); }

    async request(method, endpoint, data=null, params=null) {
        try {
            // Build URL
			var url = this.getUrl() + endpoint;
            if (params) {
			    url = url + "?" + params;
            }

            // Build headers
            const headers = {"X-Api-Key": this.apikey, 'Content-Type': 'application/json'};
			if (this.user && this.password) {
                headers["Authorization"] = "Basic " + btoa(this.user + ":" + this.password);
            }

            // Build data
            var body = data;
            if ((data != null) && (typeof data !== "string")) {
                body = JSON.stringify(data);
            }
        
            // console.log("Request " + method + " headers: " + JSON.stringify(headers) + " body: " + body);
            const res = await fetch(url, { method: method, body: body, headers: headers });

            if (res.status >= 400) throw new Error(`${res.status} (${res.statusText})`)
            data = await res.json();
            // console.log(`Request to ${url}: ${res.status}`); console.log(data);

            return data;
        } catch (error) {
            console.log(`Error querying endpoint ${url}: ${error}`);
            throw error;
        }
    }

    getLogo(size="48") {
        return `/img/${this.name}/${this.name}-${size}.png`;
    }

    // Check if an item exists based on its id and/or slyf, returns its slug or null
    async itemExists(item) {
        const response = await this.getItemList();
        for (var i = 0; i < response.length; i++) {
            const elt = response[i];
            if ((item.itemid && this.checkItemId(item.itemid, elt)) || (item.itemslug && item.itemslug === elt.titleSlug)) {
                return elt.titleSlug;
            }
        }
        return null;
    }

    // Look for an item based on info provided (id and/or slug), fetch and fill other info (exists, properties)
    async getItemInfo(item) {
        // Query for both existence and item info
        const [slug, results] = await Promise.all([this.itemExists(item), this.lookupItem(item)]);

        // Consolidate results
        item.itemslug = slug;
        item.exists = (item.itemslug)?true:false;
        if (results.length == 0) { item.properties = null; }
        if (results.length > 0) {
            item.properties = results[0];
            if (results.length > 1) console.log("Warning, several results found for this item");
        }

        return item
    }

    async getProfiles() {
        const result = await this.get(this.getProfileUrlPath());
        return result;
    }

    async getFolders() {
        const result = await this.get(this.getFolderUrlPath());
        const folders = []
        for (let i = 0; i < result.length; i++) { 
            folders.push({"name": result[i].path, "id": result[i].path})
        }
        return folders;
    }

    getAuxInfoValues() { return []; }
    getItemUrl(item) { return this.getUrl() + this.getItemPath(item) }
    checkItemId(itemid, element) { return False; }
    getItemPath(item={}) { return "/item" + ((item) ? `/${item.itemslug}` : ""); }
    getProfileUrlPath() { return "/profiles";}
    getFolderUrlPath() { return "/folders";}
    buildItemDict(item) { return {}; }
    async getItemList() { return await this.get(this.getItemPath()); }
    async lookupItem(item) { return {}; }
    async addItem(item) {
        const newItem = this.buildItemDict(item);
        await this.post(this.getItemPath(), newItem);
    }

    // tbd
    // radarr.addMovie(
    //     media.movie.text[0],
    //     $('#lstProfile').val(),
    //     $('#monitored').prop('checked'),
    //     $('#lstMinAvail').val(),
    //     false,
    //     $('#lstFolderPath').val() ? $('#lstFolderPath').val() : addPath
    // );
    // sonarr.addSeries(
    //     media.series.text[0],
    //     $('#lstProfile').val(),
    //     $('#lstSeriesType').val(),
    //     $('#monitored').prop('checked'),
    //     false,
    //     $('#lstFolderPath').val() ? $('#lstFolderPath').val() : addPath,
    //     $('#lstLanguage').val()
    // );
// 
// addMovie(movie, qualityId, monitored, minAvail, addSearch, folderPath) {
//     pulsarr.loading();
//     var newMovie = {
//         "title": movie.title,
//         "year": movie.year,
//         "qualityProfileId": parseInt(qualityId),
//         "titleSlug": movie.titleSlug,
//         "images": movie.images,
//         "tmdbid": movie.tmdbId,
//         "rootFolderPath": folderPath,
//         "monitored": monitored,
//         "minimumAvailability": minAvail,
//         "addOptions": {
//             "searchForMovie": addSearch
//         }
//     };

//     console.log("Add movie");
//     console.log(newMovie);

//     this.post("/api/v3/movie", newMovie).then(function(response) {
//         radarr.updatePreferences(monitored, qualityId, minAvail, folderPath);
//         pulsarr.info("Movie added to Radarr!");
//         setTimeout(function() {
//             window.close();
//         }, 1500);
//     }).catch(function(error) {
//         console.log("Error: " + error)
//         pulsarr.info(error);
//     });
// }
// addSeries(series, qualityId, seriesType, monitored, addSearch, folderPath, languageId) {
//     pulsarr.loading();

//     var newSeries = {
//         "title": series.title,
//         "year": series.year,
//         "qualityProfileId": parseInt(qualityId),
//         "languageProfileId": languageId,
//         "seriesType": seriesType,
//         "titleSlug": series.titleSlug,
//         "images": series.images,
//         "tvdbId": series.tvdbId,
//         "rootFolderPath": folderPath,
//         "monitored": monitored,
//         "addOptions": {
//             "ignoreEpisodesWithFiles": false,
//             "ignoreEpisodesWithoutFiles": false,
//             "searchForMissingEpisodes": addSearch
//         }
//     };
//     console.log("Adding serie");
//     console.log(newSeries);

//     this.post("/api/v3/series", newSeries).then(function(response) {
//         sonarr.updatePreferences(monitored, qualityId, seriesType, folderPath);
//         pulsarr.info("Series added to Sonarr!");
//         setTimeout(function() {
//             window.close();
//         }, 1500);
//     }).catch(function(error) {
//         pulsarr.info(error);
//     });
// }

}

export class Radarr extends Server {
	constructor () {
        super("radarr", 7878)
    }
    
    getItemUrl(item) { return this.getUrl() + "/movie" + ((item) ? `/${item.itemslug}` : "") }
    checkItemId(itemid, element) {  return (itemid === element.imdbId); }
    getItemPath(item=null) { return "/api/v3/movie" + ((item) ? `/${item.itemslug}` : ""); }
    getProfileUrlPath() { return "/api/v3/qualityProfile";}
    getFolderUrlPath() { return "/api/v3/rootfolder";}
    getAuxInfoValues() {
        return [
            {name: "Announced", id: "announced"},
            {name: "In Cinemas", id: "inCinemas"},
            {name: "Physical/Web", id: "released"},
            {name: "Pre DB/Web", id: "preDB"}
          ];    
    }
    buildItemDict(item) {
        return {
            "title": item.properties.title,
            "year": item.properties.year,
            "qualityProfileId": parseInt(item.server.profileid),
            "titleSlug": item.properties.titleSlug,
            "images": item.properties.images,
            "tmdbid": item.properties.tmdbId,
            "imdbId": item.properties.imdbid,
            "rootFolderPath": item.server.folder,
            "monitored": item.server.monitored,
            "minimumAvailability": item.server.auxinfo,
            "addOptions": {
                "searchForMovie": true
            }
        };
    }
    async lookupItem(item) {return await this.get(this.getItemPath() + "/lookup", null, "term=imdb%3A%20" + item.itemid);}
}

export class Sonarr extends Server {
	constructor () {
        super("sonarr", 8989)
    }

    getItemUrl(item) { return this.getUrl() + "/series" + ((item) ? `/${item.itemslug}` : "") }
    checkItemId(itemid, element) { return ((element.tvdbId) && (itemid === element.tvdbId.toString())); }
    getItemPath(item) { return "/api/v3/series" + ((item) ? `/${item.itemslug}` : ""); }
    getProfileUrlPath() { return "/api/v3/qualityProfile";}
    getFolderUrlPath() { return "/api/v3/rootfolder";}
    getAuxInfoValues() {
        return [{name: "Standard", id: "standard"}, {name: "Daily", id: "daily"}, {name: "Anime", id: "anime"}];
    }
    buildItemDict(item) {
        return {
            "title": item.properties.title,
            "year": item.properties.year,
            "qualityProfileId": parseInt(item.server.profileid),
            "seriesType": item.server.auxinfo,
            "titleSlug": item.properties.titleSlug,
            "images": item.properties.images,
            "tvdbId": item.properties.tvdbId,
            "rootFolderPath": item.server.folder,
            "monitored": item.server.monitored,
            "addOptions": {
                "ignoreEpisodesWithFiles": false,
                "ignoreEpisodesWithoutFiles": false,
                "searchForMissingEpisodes": true
            }
        };
    }
    async lookupItem(item) { return await this.get(this.getItemPath() + "/lookup", null, "term=tvdb%3A%20" + item.itemid); }
}


// lookupItemByTitleYear(title, year)
    // async lookupMovieByTitleYear(title, year) {
	// 	var self = this;
	// 	var searchString = title + " " + year;
	// 	searchString = encodeURI(searchString);
	// 	// antipattern: resolve acts as reject and vice versa
	// 	return new Promise(async function(resolve, reject) {
	// 		if (title === "") {
	// 			resolve();
	// 		} else {
	// 			var lookup = await self.get("/api/v3/movie/lookup", "term=" + searchString)
	// 			var existingSlug = await self.isExistingMovieByTitleSlug(lookup.text[0].titleSlug)
	// 			if (lookup) {
	// 				reject({"type": "movie", "movie": lookup, "existingSlug": existingSlug});
	// 			} else {
	// 				resolve(error);
	// 			}
	// 		};
	// 	});
	// }
	// async lookupSeriesByTitleYear(title, year) {
	// 	var self = this;
	// 	var searchString = title + " " + year;
	// 	searchString = encodeURI(searchString);
	// 	// antipattern: resolve acts as reject and vice versa
	// 	return new Promise(async function(resolve, reject) {
	// 		if (title === "") {
	// 			resolve();
	// 		} else {
	// 			var lookup = await self.get("/api/v3/series/lookup", "term=" + searchString)
	// 			var existingSlug = await self.isExistingSeriesByTitleSlug(lookup.text[0].titleSlug)
	// 			if (lookup) {
	// 				reject({"type": "series", "series": lookup, "existingSlug": existingSlug});
	// 			} else {
	// 				resolve(error);
	// 			}
	// 		};
	// 	});
	// }

const ServerList = {};
ServerList[ItemTypes.Movie] = new Radarr();
ServerList[ItemTypes.Serie] = new Sonarr();

// Find a provider matching this url
export function getServerForType(type) {
    return ServerList[type];
}
