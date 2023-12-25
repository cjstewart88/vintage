console.log(":: vintage_store ::");

const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const characters = 'ABCDEFGHIJKLMNOPQRSTUV*'.split('');

const games = [];
const concurrencyLimit = 5;

const fetchPage = async (character, pageNum) => {
  try {
    const pageResponse = await axios.get(`https://apps.apple.com/us/genre/ios-games-puzzle/id7012?letter=${character}&page=${pageNum}`);
    const page = cheerio.load(pageResponse.data);
    const gameLinks = page("#selectedcontent ul li a");

    // doing this because "L"s have a game that shows up on every page.
    // ie: page 1000 will have this one game on it
    if (gameLinks.length <= 1) {
      return null;
    } else {
      const requests = gameLinks.slice(0, concurrencyLimit).map(async (i, el) => {
        const game = {
          name: el.children[0].data,
          url: el.attribs.href,
        };

        const gameResponse = await axios.get(game.url);
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
          console.log(game)
          games.push(game);
        }
      });

      await Promise.all(requests);

      return pageNum + 1;
    }
  } catch (error) {
    console.log(`Error fetching ${character} - Page ${pageNum}: ${error.message}`);
  }
};

const run = async () => {
  for (const character of characters) {
    let page = 1;
    while (page) {
      const pagesToFetch = Array.from({ length: concurrencyLimit }, (_, i) => page + i);
      const results = await Promise.all(pagesToFetch.map(pageNum => fetchPage(character, pageNum)));
      page = results.find(result => result !== null);
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
