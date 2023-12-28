console.log(":: vintage_store ::");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// leaving out dice and educational, only a couple of games
const genres = {
  id7001: "action",
  id7002: "adventure",
  id7004: "board",
  id7005: "card",
  id7006: "casino",
  id7003: "casual",
  id7009: "family",
  id7011: "music",
  id7012: "puzzle",
  id7013: "racing",
  id7014: "role-playing",
  id7015: "simulation",
  id7016: "sports",
  id7017: "strategy",
  id7018: "trivia",
  id7019: "word",
};
const characters = "ABCDEFGHIJKLMNOPQRSTUV*".split("");

// less genre/character/page combinations to test with
// const genres = {
//   id7006: "casino",
//   id7017: "strategy",
// };
// const characters = "Z*".split("");

const apps = {};

const fetchPage = async (genreId, character, pageNum) => {
  const genre = genres[genreId];
  try {
    const pageResponse = await axios.get(
      `https://apps.apple.com/us/genre/ios-games-${genre}/${genreId}?letter=${character}&page=${pageNum}`
    );
    const page = cheerio.load(pageResponse.data);
    const appLinks = page("#selectedcontent ul li a");

    // doing this because "L"s have a game that shows up on every page.
    // ie: page 1000 will have this one game on it
    if (appLinks.length <= 1) {
      return null;
    } else {
      console.log(`[${genre}] => ${character}:${pageNum}`);

      for (let i = 0; i < appLinks.length; i++) {
        const el = appLinks[i];
        const appUrl = el.attribs.href;

        if (apps[appUrl]) {
          apps[appUrl].genres.push(genre);
        } else {
          const app = {
            name: el.children[0].data,
            url: appUrl,
            genres: [genre],
          };

          try {
            const appResponse = await axios.get(app.url);
            const appPage = cheerio.load(appResponse.data);

            app.inAppPurchases =
              appPage(".app-header__list__item--in-app-purchase").length === 1;
            const price = appPage(".app-header__list__item--price")
              .text()
              .toLowerCase();
            app.price = price;

            const ratingData = appPage(".we-rating-count").text().split(" • ");
            app.rating = parseFloat(ratingData[0]);

            const numberOfRatings = ratingData[1]?.split(" ")[0];
            app.numberOfRatings =
              parseFloat(numberOfRatings || 0) *
              (numberOfRatings?.includes("K") ? 1000 : 1);

            let iPadMinOSVersion = appPage(
              ".information-list__item__definition__item__definition"
            )
              .text()
              .split("\n")
              .find((text) => text.includes("iPadOS"));

            app.supportsGameCenter =
              appPage('.supports-list h3:contains("Game Center")').length === 1;

            if (!iPadMinOSVersion) {
              continue;
            }

            iPadMinOSVersion = iPadMinOSVersion.trim().match(/(\d+)/)[0];

            app.ipadOSVersion = parseInt(iPadMinOSVersion);

            if (
              parseFloat(app.rating) >= 4 &&
              app.numberOfRatings >= 20 &&
              app.ipadOSVersion <= 9 &&
              !app.supportsGameCenter &&
              !app.inAppPurchases
            ) {
              console.log(`${app.name} - ${app.url}`);
              apps[app.url] = app;
            }
          } catch (e) {
            console.log(
              `Error fetching ${app.name} - ${app.url}: ${e.message}`
            );
          }
        }
      }
      console.log(apps);
      return pageNum + 1;
    }
  } catch (error) {
    console.log(
      `Error fetching ${character} - Page ${pageNum}: ${error.message}`
    );
  }
};

const run = async () => {
  for (const genreId in genres) {
    console.log(`==========================================`);
    for (const character of characters) {
      let page = 1;
      while (page) {
        page = await fetchPage(genreId, character, page);
      }
    }
  }

  const appsArray = Object.values(apps);
  // sort by rating and then by numberOfRatings
  appsArray.sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    } else {
      return b.numberOfRatings - a.numberOfRatings;
    }
  });

  fs.writeFile("tmp-data.json", JSON.stringify(appsArray, null, 2), (err) => {
    if (err) {
      console.error("Error writing to the file:", err);
    } else {
      console.log("Results written to tmp-data.json");
    }
  });
};

run();
