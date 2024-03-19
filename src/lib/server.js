import { lookupService } from "dns";

export const ItemTypes = {
    Unknown: null,
	Movie: "movie",
	Serie: "serie",
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
        this.profileid = server_settings.preferences.qualityProfileId || "1" ;
        this.auxinfo = server_settings.preferences.auxInfo || "1" ;
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
            },
        }
    }

    // Load the config from the extension storage
    loadConfig(callback = null) {
        const wanted = {}
        wanted[this.name] = this.getConfig()
        chrome.storage.sync.get(
          wanted,
            (items) => {
              this.setConfig(items[this.name]);
              console.debug(`Loaded ${this.name} config: ${JSON.stringify(this.getConfig())}`);
              if (callback) callback(items);
            }
        );
    }

    // Save config to the extension storage
    saveConfig(callback) {
        const wanted = {}
        wanted[this.name] = this.getConfig()
        console.debug(`Saved ${this.name} config: ${JSON.stringify(this.getConfig())}`);
        chrome.storage.sync.set(
            wanted, 
            () => { callback(); }
        );
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

    async get(endpoint, data=null, params=null) {
        try {
            // Build URL
			var url = this.getUrl() + endpoint;
            if (params) {
			    url = url + "?" + params;
            }

            // Build headers
            const headers = {"X-Api-Key": this.apikey};
			if (this.user && this.password) {
                headers["Authorization"] = "Basic " + btoa(this.user + ":" + this.password);
            }

            // Build data
            var body = data;
            if ((data != null) && (typeof data !== "string")) {
                body = JSON.stringify(data);
            }
        
            const res = await fetch(url, { method: "get", body: body, headers: headers });

            if (res.status >= 400) throw new Error(`${res.status} (${res.statusText})`)
            data = await res.json();
            console.debug(`Request to ${url}: ${res.status} ${JSON.stringify(data)}`); 

            return data;
        } catch (error) {
            console.log(`Error querying endpoint ${url}: ${error}`);
            throw error;
        }
    }

    getLogo(size="48") {
        return `./img/${this.name}/${this.name}-${size}.png`;
    }

    itemUrlPath() { return ""; }
    checkItemId(itemid, item) { return False}

    async itemExists(itemid = null, itemslug = null) {
        const response = await this.get(this.itemUrlPath());
        for (var i = 0; i < response.length; i++) {
            const elt = response[i];
            if ((itemid && this.checkItemId(itemid, elt)) || (itemslug && itemslug === elt.titleSlug)) {
                return elt.titleSlug;
            }
        }
    }
    //     isExistingMovie(imdbid) {
    //         var self = this;
    //         return new Promise(function(resolve, reject) {
    //             self.get("/api/v3/movie", "").then(function(response) {
    //                 for (var i = 0; i < response.text.length; i++) {
    //                     if (imdbid === response.text[i].imdbId) {
    //                         resolve(response.text[i].titleSlug);
    //                     }
    //                 }
    //                 resolve("");
    //             }).catch(function(error) {
    //                 reject(error);
    //             });
    //         });
    //     }

    // 	isExistingMovieByTitleSlug(titleSlug) {
    // 		var self = this;
    // 		return new Promise(function(resolve, reject) {
    // 			self.get("/api/v3/movie", "").then(function(response) {
    // 				for (var i = 0; i < response.text.length; i++) {
    // 					if (titleSlug === response.text[i].titleSlug) {
    // 						resolve(response.text[i].titleSlug);
    // 					}
    // 				}
    // 				resolve("");
    // 			}).catch(function(error) {
    // 				reject(error);
    // 			});
    // 		});
    // 	}
    // }
    // async isExistingSeries(tvdbid) {
    //     var self = this;
    //     return new Promise(function(resolve, reject) {
    //         self.get("/api/v3/series", "").then(function(response) {
    //             for (var i = 0; i < response.text.length; i++) {
    //                 if (tvdbid == response.text[i].tvdbId) {
    //                     resolve(response.text[i].titleSlug);
    //                 }
    //             }
    //             resolve("");
    //         }).catch(function(error) {
    //             reject(error);
    //         });
    //     });
    // }

    // isExistingSeriesByTitleSlug(titleSlug) {
    //     var self = this;
    //     return new Promise(function(resolve, reject) {
    //         self.get("/api/v3/series", "").then(function(response) {
    //             for (var i = 0; i < response.text.length; i++) {
    //                 if (titleSlug === response.text[i].titleSlug) {
    //                     resolve(response.text[i].titleSlug);
    //                 }
    //             }
    //             resolve("");
    //         }).catch(function(error) {
    //             reject(error);
    //         });
    //     });
    // }
    // }
    async lookupItem(itemid) {
        //if exist -> existing itemslug + movie
        // if found: -> movie

        const existing_elt = await this.itemExists(itemid=itemid);

        // TODO: check if exist + lookup to get info to display !
        // do both in // and wait for join ? hmm.....
        if (existing_elt) {
            console.log("yp pipo trouve: " + existing_elt)
            // {"type": "movie", "movie": lookup, "existingSlug": existingSlug});
        }
        else {
            console.log("yp pipo trouve: " + existing_elt)
            // {"type": "movie", "movie": lookup, "existingSlug": existingSlug});

        }
        // Return: item_info + item_slug
        // {"type": "movie", "movie": lookup, "existingSlug": existingSlug});
    }
}

export class Radarr extends Server {
	constructor () {
        super("radarr", 7878)
    }

    itemUrlPath() { return "/api/v3/movie"; }
    checkItemId(itemid, item) {  return (itemid === item.imdbId); }
}

export class Sonarr extends Server {
	constructor () {
        super("sonarr", 8989)
    }

    itemUrlPath() { return "/api/v3/series"; }
    checkItemId(itemid, item) { return ((item.tvdbId) && (itemid === item.tvdbId.toString())); }
}


// global
// post()
// getProfiles()
// getFolders()
// openItem(itemslug)
    // use open_url "/movies/"" or "/series/"
    // chrome.tabs.create({
    //     url: radarr.constructBaseUrl() + "/movies/" + media.existingSlug
    //     url: sonarr.constructBaseUrl() + "/series/" + media.existingSlug
    // });
// addItem()
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




    // lookupMovie(imdbid, tvdbid = "") {
    //     var self = this;
    //     // antipattern: resolve acts as reject and vice versa
    //     return new Promise(function(resolve, reject) {
	// 		// Cancel movie search if there a tvid. This means the imdb entry related to a valid tv show.
	// 		// This prevents issues where an imdb show also has a movie entry; e.g. tt6741278.
	// 		// The initial behavior was "first answer wins". This forces tv show entry over movie.
    //         if (imdbid === "" || tvdbid != "") {
    //             resolve();
    //         } else {
    //             var existingSlug = self.isExistingMovie(imdbid);
    //             var lookup = self.get("/api/v3/movie/lookup", "term=imdb%3A%20" + imdbid);
    //             Promise.all([lookup, existingSlug]).then(function(response) {
	// 				console.log("movie lookup result:");
	// 				console.log(response);
	// 				if (response[0].text.length == 0) resolve();
    //                 reject({"type": "movie", "movie": response[0], "existingSlug": response[1]});
    //             }).catch(function(error) {
    //                 resolve(error);
    //             });
    //         }
    //     });
    // }
    // async lookupSeries(tvdbid) {
    //     var self = this;
    //     // antipattern: resolve acts as reject and vice versa
    //     return new Promise(function(resolve, reject) {
    //         if (tvdbid === "") {
    //             resolve();
    //         } else {
    //             var existingSlug = self.isExistingSeries(tvdbid);
    //             var lookup = self.get("/api/v3/series/lookup", "term=tvdb%3A%20" + tvdbid);
    //             Promise.all([lookup, existingSlug]).then(function(response) {
	// 				console.log("serie lookup result:");
	// 				console.log(response);
	// 				if (response[0].text.length == 0) resolve();
    //                 reject({"type": "series", "series": response[0], "existingSlug": response[1]});
    //             }).catch(function(error) {
    //                 resolve(error);
    //             });
    //         }
    //     });
    // }

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
