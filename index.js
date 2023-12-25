console.log(":: vintage_store ::");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const characters = "ABCDEFGHIJKLMNOPQRSTUV*".split("");

const games = [];

const fetchPage = async (character, pageNum) => {
  try {
    const pageResponse = await axios.get(
      `https://apps.apple.com/us/genre/ios-games-puzzle/id7012?letter=${character}&page=${pageNum}`
    );
    const page = cheerio.load(pageResponse.data);
    const gameLinks = page("#selectedcontent ul li a");

    // doing this because "L"s have a game that shows up on every page.
    // ie: page 1000 will have this one game on it
    if (gameLinks.length <= 1) {
      return null;
    } else {
      for (let i = 0; i < gameLinks.length; i++) {
        const el = gameLinks[i];
        const game = {
          name: el.children[0].data,
          url: el.attribs.href,
        };

        try {
          const gameResponse = await axios.get(game.url);
          const gamePage = cheerio.load(gameResponse.data);

          game.inAppPurchases =
            gamePage(".app-header__list__item--in-app-purchase").length === 1;
          const price = gamePage(".app-header__list__item--price")
            .text()
            .toLowerCase();
          game.price = price;

          const ratingData = gamePage(".we-rating-count").text().split(" • ");
          game.rating = parseFloat(ratingData[0]);
          game.numberOfRatings = ratingData[1]?.split(" ")[0];

          let iPadMinOSVersion = gamePage(
            ".information-list__item__definition__item__definition"
          )
            .text()
            .split("\n")
            .find((text) => text.includes("iPadOS"));

          game.supportsGameCenter =
            gamePage('.supports-list h3:contains("Game Center")').length === 1;

          if (!iPadMinOSVersion) {
            continue;
          }

          iPadMinOSVersion = iPadMinOSVersion.trim().match(/(\d+)/)[0];

          game.ipadOSVersion = parseInt(iPadMinOSVersion);

          if (
            parseFloat(game.rating) >= 4 &&
            game.price === "free" &&
            game.ipadOSVersion <= 9 &&
            !game.supportsGameCenter &&
            !game.inAppPurchases
          ) {
            console.log(game);
            games.push(game);
          }
        } catch (e) {
          console.log(
            `Error fetching ${game.name} - ${game.url}: ${e.message}`
          );
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

  fs.writeFile("results.json", JSON.stringify(games, null, 2), (err) => {
    if (err) {
      console.error("Error writing to the file:", err);
    } else {
      console.log("Results written to results.json");
    }
  });
};

run();
