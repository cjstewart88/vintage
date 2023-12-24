console.log(":: vintage_store ::");

const axios = require("axios");
const cheerio = require("cheerio");

const url = "https://apps.apple.com/us/genre/ios-games-puzzle/id7012";

async function scrape() {
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const gameElements = $("#selectedcontent ul li a");
  // const firstTwo = gameElements.slice(0, 2);

  gameElements.each((i, el) => {
    const game = {
      name: el.children[0].data,
      url: el.attribs.href,
    };

    axios
      .get(el.attribs.href)
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
          parseFloat(game.rating) >= 4.5 &&
          game.price === "free" &&
          game.ipadOSVersion <= 9
        ) {
          console.log(game);
          console.log("-------------------");
        }
      })
      .catch((error) => {
        // console.error(`Error fetching ${el.attribs.href}: ${error.message}`);
      });
  });
}

// Run the scraping function
scrape();
