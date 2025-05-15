import youtubedl from "youtube-dl-exec";
import { demuxProbe, createAudioResource } from "@discordjs/voice";
import { logger } from "./utils/logger/logger.mjs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import { spawn, exec } from "child_process";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { IUrlExtractor } from "./extractor/UrlExtractor.mjs";
console.log("Current path:", __dirname);
export class YtDlpExtractError extends Error {
  constructor(message, url) {
    super(message);
    this.name = "YtDlpExtractError";
    this.url = url;
  }
}

import { Readable } from "stream";

async function probeAndCreateResource(readableStream) {
  const { stream, type } = await demuxProbe(readableStream);
  return createAudioResource(stream, { inputType: type });
}

export default class Yt_dlp_Extractor extends IUrlExtractor {
  constructor(options = null) {
    super();
    this.options = options;
    if (!this.options) {
      this.options = {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
        format: "bestaudio/best",
        audioFormat: "opus",
        audioQuality: "0",
        skipDownload: true,
        cookies: "cookies.txt",
        addHeader: ["referer:youtube.com", "user-agent:googlebot"],
      };
    }
  }
  async getStreamUrl(url) {
    const urlType = this._validateUrl(url);
    if (urlType.type === "single") {
      return await this.getStreamSingleUrl(url);
    } else if (urlType.type === "playlist") {
      return await this.getStreamSingleUrl(this.getPlaylistUrls(url)[0]);
    } else {
      throw new Error("Invalid URL");
    }
  }

  async getItems(url) {
    logger.debug("Getting URLs from:", url);
    const urlType = this._validateUrl(url);
    if (urlType.type === "single") {
      logger.debug("Single URL detected");
      let metadata = await this.getSingleMetadata(url);
      let item = {
        orig_url: url,
        metadata: metadata,
      };
      return [item];
    } else if (urlType.type === "playlist") {
      logger.debug("Getting playlist metadata");
      let metadata = await this.getPlaylistMetadata(url);
      let items = this.getPlaylistItems(metadata);
      return items;
    } else {
      throw new Error("Invalid URL");
    }
  }
  async getMetadata(url) {
    logger.debug("Getting metadata from:", url);
    const urlType = this._validateUrl(url);
    if (urlType.type === "single") {
      logger.debug("Single URL detected");
      return await this.getSingleMetadata(url);
    } else if (urlType.type === "playlist") {
      logger.debug("Playlist URL detected");
      return await this.getPlaylistMetadata(url);
    } else {
      throw new Error("Invalid URL");
    }
  }

  async getSingleMetadata(url) {
    try {
      let resource = await youtubedl(url, this.options);
      return resource;
    } catch (err) {
      logger.error("Error getting metadata:", err);
      throw new YtDlpExtractError("Failed to extract metadata", url);
    }
  }

  // Method to get the URL using yt-dlp
  async getStreamSingleUrl(url) {
    try {
      let resource = await youtubedl(url, this.options);
      return resource.requested_downloads[0].url;
    } catch (err) {
      logger.error("Error getting stream URL:", err);
      throw new YtDlpExtractError("Failed to extract stream URL", url);
    }
  }
  // Method to check if a URL is valid and determine its type
  _validateUrl(url) {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (youtubeRegex.test(url)) {
      if (
        url.includes("list=") ||
        url.includes("playlist?list=") ||
        url.includes("playlist?")
      ) {
        return { type: "playlist" };
      }
      return { type: "single" };
    } else {
      return { type: "invalid" };
    }
  }
  async getPlaylistMetadata(url_playlist) {
    // add to options flat-playlist
    let opt = {
      ...this.options,
      flatPlaylist: true,
    };
    let metadata = await youtubedl(url_playlist, opt);
    console.log("Metadata:", metadata);
    return metadata;
  }
  getPlaylistItems(metadata) {
    let items = [];
    for (const item of metadata.entries) {
      if (item.url) {
        if (item.channel !== null && item.title !== "[Deleted video]") {
          items.push({
            orig_url: item.url,
            metadata: item,
          });
        }
      }
    }
    return items;
  }
  // Method to create a stream from the URL
  createStream(url) {
    logger.debug("Creating stream from URL:", url);
    return fetch(url).then((r) => Readable.fromWeb(r.body));
  }
  async createAudioResource(url) {
    url = await this.getStreamUrl(url);
    const stream = await this.createStream(url);
    return probeAndCreateResource(stream);
  }
}

// Test the extractor
async function testExtractor() {
  let options = {
    // print url
    print: "urls",
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    format: "bestaudio/best",
    audioFormat: "opus",
    audioQuality: "0",
    skipDownload: true,
    cookies: "cookies.txt",
    addHeader: ["referer:youtube.com", "user-agent:googlebot"],
  };
  const url = "https://www.youtube.com/watch?v=PKRUKalbx3s"; // Replace with a valid YouTube URL
  const extractor = new Yt_dlp_Extractor(options);
  try {
    const items = await extractor.getMetadata(url);
    console.log("Extracted items:", items);
  } catch (error) {
    console.error("Error extracting items:", error);
  }
}

// Now with a playlist
async function testPlaylistExtractor() {
  const url =
    "https://www.youtube.com/watch?v=YQHsXMglC9A&list=PLbpi6ZahtOH7DrxWUmkwvsXnFeCfB5LUp"; // Replace with a valid YouTube playlist URL
  let options = {
    // print url
    dumpSingleJson: true,
    //print: "%(url)s",
    //compatOptions: ["no-youtube-unavailable-videos"],
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
    format: "bestaudio/best",
    audioFormat: "opus",
    audioQuality: "0",
    skipDownload: true,
    cookies: "cookies.txt",
    addHeader: ["referer:youtube.com", "user-agent:googlebot"],
  };
  const extractor = new Yt_dlp_Extractor();
  try {
    const items = await extractor.getItems(url);
    // Pass all items to the extractor2 on one single call
    // Join all the urls with a comma
    //let urls = items.map((item) => item.orig_url).join(" ");

    let urls = items.map((item) => item.orig_url);
    const outputFile = `${__dirname}/output.json`;
    //const child = spawn("yt-dlp", [urls, "--dump-single-json", "-o ./out.txt"])
    //let urls_list = urls.split(" ");
    const child_spawn = spawn(
      "yt-dlp",
      [
        ...urls,
        "--dump-single-json",
        "--no-check-certificates",
        "--no-warnings",
        "--prefer-free-formats",
        "--format",
        "bestaudio/best", // Option and its value as separate elements
        "--audio-format",
        "opus", // Option and its value
        "--audio-quality",
        "0", // Option and its value
        "--skip-download",
        "--cookies",
        "cookies.txt", // Option and its value
        "--add-header",
        "referer:youtube.com", // Option and its value
        "--add-header",
        "user-agent:googlebot", // Option and its value
      ],
      {
        // shell: false, // This is the default, so explicitly setting it is optional
        detached: false,
        stdio: ["ignore", "pipe", "pipe"], // ["stdin", "stdout", "stderr"]
      }
    );
    /* const child_exec = exec(
      `yt-dlp ${urls} --dump-single-json`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
      }
    ); */
    let results = [];
    let output = "";
    child_spawn.stdout.on("data", (data) => {
      // Insert in the middle of the string
      output += data.toString();
      //console.log(`stdout: ${data}`);
    });

    child_spawn.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });
    child_spawn.on("exit", (code) => {
      console.log(`Child process exited with code ${code}`);
      // Parse the output spltting
      // Output follows this format:
      // {id:1}{id:2}
      // Split the output by new line
      let lines = output.split("\n");
      // Parse each line as JSON
      for (let line of lines) {
        if (line.trim() !== "") {
          try {
            let item = JSON.parse(line);
            results.push(item);
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        }
      }
      output = {
        items: results,
      };
      output = JSON.stringify(output, null, 2);
      // Write the output to a file
      fs.writeFileSync(outputFile, output);
      console.log("Output written to file:", outputFile);
    });
    //const output3 = fs.createWriteStream("./out_exec.json");
    //child_exec.stdout.pipe(output3);

    console.log("------------------------------------------");
    // All items is an object with
  } catch (error) {
    console.error("Error extracting items:", error);
  }
}
//youtube-dl -j --flat-playlist 'https://www.youtube.com/watch?v=k4JGSAmu4lg' | jq -r '.id' | sed 's_^_https://youtube.com/v/_'
//testExtractor();
console.log("Testing playlist extractor\n");
testPlaylistExtractor();
