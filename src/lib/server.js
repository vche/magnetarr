// var magnetarrConfig = {
// 	"radarr": {
// 		"enabled": false,
// 		"configuration": {
// 			"host": "http://127.0.0.1",
// 			"port": "8989",
// 			"apikey": "",
// 			"auth": {
// 				"user": "",
// 				"pass": "",
// 			}
// 		},
// 		"preferences": {
// 			"monitored": true,
// 			"minAvail": "announced",
// 			"qualityProfileId": 1
// 		}
// 	},
// 	"sonarr": {
// 		"enabled": false,
// 		"configuration": {
// 			"host": "http://127.0.0.1",
// 			"port": "7878",
// 			"apikey": "",
// 			"auth": {
// 				"user": "",
// 				"pass": "",
// 			}
// 		},
// 		"preferences": {
// 			"monitored": true,
// 			"seriesType": "standard",
// 			"qualityProfileId": 1
// 		}
// 	}
// };

export class Server {
	constructor (name, default_port=0) {
		this.name = name;
		this.default_port = default_port;
        this.setConfig();
	}

    // Configure server from config dictionary
    setConfig(server_settings = null) {
        // Set properties or use default
        if (server_settings == null) server_settings = {configuration: {auth: {}}};
        if (server_settings.configuration === undefined) server_settings["configuration"] = {};
        if (server_settings.configuration.auth === undefined) server_settings.configuration["auth"] = {};
        this.enabled = server_settings.enabled || false;
        this.host = server_settings.configuration.host || "http:127.0.0.1";
        this.port = server_settings.configuration.port || this.default_port;
        this.apikey = server_settings.configuration.apikey || "" ;
        this.user = server_settings.configuration.auth.user || "" ;
        this.password = server_settings.configuration.auth.password || "" ;        
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
        }
    }

    // Load the config from the extension storage
    loadConfig(callback) {
        const wanted = {}
        wanted[this.name] = this.getConfig()
        chrome.storage.sync.get(
          wanted,
            (items) => {
              this.setConfig(items[this.name]);
              console.log(`Loaded ${this.name} config: ${JSON.stringify(this.getConfig())}`);
              callback(items);
            }
        );
    }

    // Save config to the extension storage
    saveConfig(callback) {
        const wanted = {}
        wanted[this.name] = this.getConfig()
        console.log(`Saved ${this.name} config: ${JSON.stringify(this.getConfig())}`);
        chrome.storage.sync.set(
            wanted, 
            () => { callback(); }
        );
    }

    // Build the server url
    constructBaseUrl() {
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
			var url = this.constructBaseUrl() + endpoint;
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
}