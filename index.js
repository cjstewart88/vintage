console.log(":: vintage_store ::");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const url = "https://apps.apple.com/us/genre/ios-games-puzzle/id7012";

async function run() {
  const games = [];

  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const gameElements = $("#selectedcontent ul li a");
  // const firstTwo = gameElements.slice(0, 2);

  const requests = gameElements.map(async (i, el) => {
    const game = {
      name: el.children[0].data,
      url: el.attribs.href,
    };

    await axios
      .get(game.url)
      .then((gameResponse) => {
        const gamePage = cheerio.load(gameResponse.data);

        const price = gamePage(".app-header__list__item--price")
          .text()
          .toLowerCase();
        game.price = price;

        const rating = gamePage(".we-rating-count").text().split(" ")[0];
        game.rating = parseFloat(rating);

        let iPadMinOSVersion = gamePage(
          ".information-list__item__definition__item__definition"
        )
          .text()
          .split("\n")
          .find((text) => text.includes("iPadOS"));

        if (!iPadMinOSVersion) {
          return;
        }

        iPadMinOSVersion = iPadMinOSVersion.trim().match(/(\d+)/)[0];

        game.ipadOSVersion = parseInt(iPadMinOSVersion);

        if (
          parseFloat(game.rating) >= 4 &&
          game.price === "free" &&
          game.ipadOSVersion <= 9
        ) {
          games.push(game);
        }
      })
      .catch((error) => {
        console.log(`Error fetching ${game.url}: ${error.message}`);
      });
  });

  await Promise.all(requests);
  fs.writeFile("results.json", JSON.stringify(games, null, 2), (err) => {
    if (err) {
      console.error("Error writing to the file:", err);
    } else {
      console.log("Results written to results.json");
    }
  });
}

// Run the scraping function
run();
