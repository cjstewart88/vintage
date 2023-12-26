# vintage

iOS apps have a minimum iOS version and old devices can not update past specific iOS versions. This makes finding apps cumbersome. vintage
currates apps using data from https://apps.apple.com and provides a simple UI for browsing the apps.

Browse the data here: https://cjstewart88.github.io/vintage

#### Current Criteria

- games
- min iOS version 9
- over 20 reviews
- 4+ rating
- does not use game center
- does not have in-app purchases

### Setup

The data is sorted by rating and then by number of ratings. You can also filter by cost (all/free/paid)

```
npm install
```

### Browsing the data

```
npm run browseData
```

### Running the data collector

If you'd like to modify criteria that considers an app valid, you can modify `index.js` and run the data collector:

```
npm run getData
```

When the script is finished, results are saved to `tmp-data.json`. If this data looks good, you can move the data to `data.json` as the new source of truth.
