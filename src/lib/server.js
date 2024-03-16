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
		var self = this;
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

    // Send a get request to the server
	get(endpoint, params) {
		var self = this;
		return new Promise(function(resolve, reject) {
            console.log("get pipo")
			var http = new XMLHttpRequest();
			var url = self.constructBaseUrl() + endpoint + "?" + params;

			http.open("GET", url, true);
			http.timeout = 5000;
			if (self.auth === "true") http.setRequestHeader("Authorization", "Basic " + btoa(self.user + ":" + self.password));
			http.setRequestHeader("X-Api-Key", self.apikey);

			http.onload = function() {
				if (http.status === 200) {
					var results = {
						"text": JSON.parse(http.responseText),
						"status": http.status
					};
					self.isEnabled = true;
					resolve(results);
				} else {
					switch (http.status) {
						case 401:
						self.isEnabled = false;
						reject(self.name + " Unauthorised! Please check your API key or server authentication.");
						break;
						case 500:
						self.isEnabled = false;
						reject("Failed to find movie or series! Please check you are on a valid IMDB page.");
						break;
						default:
						self.isEnabled = false;
						reject(Error("(" + http.status + ")" + http.statusText));
					}
				}
			};

			http.ontimeout = function(error) {
				self.isEnabled = false;
				reject(Error(self.name + " server took too long to respond. Please check configuration."));
			};

			http.onerror = function() {
				if (self.name === undefined) {
					self.isEnabled = false;
					reject(Error(self.name + " could not resolve host. Please check your configuration and network settings."));
				} else {
					self.isEnabled = false;
					reject(Error("Could not resolve " + self.name + " host. Please check your configuration and network settings."));
				}
			};

			http.send();
		});
	}
}