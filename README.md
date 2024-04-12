# Magnetarr

Browser extension for adding movies to [Radarr](https://radarr.video) or Series' to [Sonarr](https://sonarr.tv) while browsing imdb.com, thetvdb.com, themoviedb.com, inspired by [Pulsarr](https://github.com/roboticsound/Pulsarr), completely rewritten in react.
- [Chrome](https://chrome.google.com/webstore/detail/pulsarr/dcildkalkckjjdfpgagmnbbfooogopkd)
- [Firefox]()
- iOS/OSX Xcode project provided for anyone to build and run locally (follow instructions [here](https://developer.apple.com/documentation/safariservices/safari_web_extensions/running_your_safari_web_extension)), but the extension is not distributed on the app store (i'm not paying the enrollment just for this:P)

![](release/img/svg/screen2.jpg)

## TODO
- Find how to cleanup manifest warnings for both chrome and firefox 
  - manifest generation ? 2 static manifets ?
- update package build to remove svg
- upload to firefox store

## Development

The extension is built in the `release` folder, which is the folder to load as unpacked extension for tests. 

### Build the extension

```bash
npm run build
```

### Build a release
This will clean all older artefacts before building, and pack the built extension to a zip

```bash
npm run release
```

This actually does a `npm run clean`, `npm run build`, and `npm run pack`

### Start development build

Start a watch daemon that will rebuild the extension upon changes in the source folder.

```bash
npm run dev
```


## References
- [Pulsarr](https://github.com/roboticsound/Pulsarr)
- [Radarr](https://github.com/Radarr/Radarr)
- [Sonarr](https://github.com/Sonarr/Sonarr)
- [Parcel](https://parceljs.org)
- [Chrome extension API](https://developer.chrome.com/docs/extensions/reference/api/)

Bug Reports/Feature Requests https://github.com/vche/magnetarr
