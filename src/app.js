import cors from "cors";
import express from "express";
import scriptData from "../data/scriptData.js";
import NodeCache from "node-cache";
import cron from "node-cron";
import fs from "fs";

const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

// Initialize NodeCache
const cache = new NodeCache();

// Flag to indicate whether to fetch data from the remote server
const fetchFromRemote = false;

// Function to fetch and cache data from the remote server
// Function to fetch and cache data
async function fetchDataFromRemoteAndCache() {
  try {
    console.log("Please wait loading angle broking data to cache app start.");
    const response = await fetch(
      "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch data");
    }

    const reader = response.body.getReader();
    const contentLength = parseInt(response.headers.get("Content-Length"), 10);
    let receivedLength = 0;
    let chunks = [];

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      chunks.push(value);
      receivedLength += value.length;
      const progress = Math.round((receivedLength / contentLength) * 100);
      process.stdout.write(`\rProgress: ${progress}%`);
    }

    const buffer = new Uint8Array(receivedLength);
    let offset = 0;

    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    const data = JSON.parse(new TextDecoder("utf-8").decode(buffer));

    // Set data in cache after entire response is received
    cache.set("scripts", data);
    console.log("\nData loaded into cache on app start.");
  } catch (error) {
    console.error(
      "Error fetching and caching script details on app start:",
      error
    );
  }
}

// Function to start the app
async function startApp() {
  try {
    if (fetchFromRemote) {
      await fetchDataFromRemoteAndCache(); // Fetch and cache data from remote server on app start
    } else {
      // Read data from local file and set it in cache
      const rawData = fs.readFileSync("./data/OpenAPIScripMaster.json");
      const data = JSON.parse(rawData);
      cache.set("scripts", data);
      console.log("Data loaded from local file into cache on app start..");
    }

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Error starting the app:", error);
  }
}

startApp();

// Routes
app.get("/api/v1/getscripts", async (req, res) => {
  try {
    const rawData = fs.readFileSync("./data/scriptData.json");
    const data = JSON.parse(rawData);
    res.json(data);
  } catch (error) {
    console.error("Error fetching script details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Routes
app.get("/api/v1/getscriptbyname", async (req, res) => {
  try {
    const name = req.query.name;
    if (!name) {
      return res.status(400).json({ error: "Name parameter is required" });
    }

    const cachedData = cache.get("scripts");
    if (!cachedData) {
      return res
        .status(404)
        .json({
          error: "Data not available in cache. Please try again later.",
        });
    }

    //const script = cachedData.find(item => item.name === name);
    const script = cachedData.filter(
      (record) => record.name === name && record.exch_seg === "NFO"
    );
    if (!script) {
      return res.status(404).json({ error: "Script not found" });
    }

    res.json(script);
  } catch (error) {
    console.error("Error fetching script details by name:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get NFO symbols
app.get("/api/v1/getnfosymbols", async (req, res) => {
  try {
    const cachedData = cache.get("scripts");

    if (cachedData) {
      const nseSymbols = cachedData
        .filter((item) => item.exch_seg === "NFO")
        .map((item) => item.symbol);
      res.json(nseSymbols);
    } else {
      res
        .status(404)
        .json({ error: "Data not available. Please try again later." });
    }
  } catch (error) {
    console.error("Error fetching NSE symbols:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to get paginated details
app.get("/api/v1/getdetails", async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;

  try {
    const cachedData = cache.get("scripts");

    if (cachedData) {
      console.log("Getting from cache");
      const paginatedData = cachedData.slice(startIndex, endIndex);
      res.json({ data: paginatedData, page, pageSize });
    } else {
      console.log("Getting from webserver");
      res
        .status(404)
        .json({ error: "Data not available. Please try again later." });
    }
  } catch (error) {
    console.error("Error fetching script details:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Schedule cache refresh every 1 hours
cron.schedule("0 */1 * * *", async () => {
  console.log("Refreshing cache...");
  try {
    if (fetchFromRemote) {
      await fetchDataFromRemoteAndCache();
    } else {
      // Read data from local file and set it in cache
      const rawData = fs.readFileSync("./data/OpenAPIScripMaster.json");
      const data = JSON.parse(rawData);
      cache.set("scripts", data);
      console.log("Data loaded from local file into cache on cache refresh.");
    }
  } catch (error) {
    console.error("Error refreshing cache:", error);
  }
});
