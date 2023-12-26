console.log(":: vintage_store ::");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const characters = "ABCDEFGHIJKLMNOPQRSTUV*".split("");

const apps = [];

const fetchPage = async (character, pageNum) => {
  try {
    const pageResponse = await axios.get(
      `https://apps.apple.com/us/genre/ios-games-puzzle/id7012?letter=${character}&page=${pageNum}`
    );
    const page = cheerio.load(pageResponse.data);
    const appLinks = page("#selectedcontent ul li a");

    // doing this because "L"s have a game that shows up on every page.
    // ie: page 1000 will have this one game on it
    if (appLinks.length <= 1) {
      return null;
    } else {
      for (let i = 0; i < appLinks.length; i++) {
        const el = appLinks[i];
        const app = {
          name: el.children[0].data,
          url: el.attribs.href,
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
            console.log(app);
            apps.push(app);
          }
        } catch (e) {
          console.log(`Error fetching ${app.name} - ${app.url}: ${e.message}`);
        }
      }

      return pageNum + 1;
    }
  } catch (error) {
    console.log(
      `Error fetching ${character} - Page ${pageNum}: ${error.message}`
    );
  }
};

const run = async () => {
  for (const character of characters) {
    let page = 1;
    while (page) {
      page = await fetchPage(character, page);
    }
  }

  // sort by rating and then by numberOfRatings
  apps.sort((a, b) => {
    if (b.rating !== a.rating) {
      return b.rating - a.rating;
    } else {
      return b.numberOfRatings - a.numberOfRatings;
    }
  });

  fs.writeFile("tmp-data.json", JSON.stringify(apps, null, 2), (err) => {
    if (err) {
      console.error("Error writing to the file:", err);
    } else {
      console.log("Results written to tmp-data.json");
    }
  });
};

run();
