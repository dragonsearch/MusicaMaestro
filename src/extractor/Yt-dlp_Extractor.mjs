import youtubedl from "youtube-dl-exec";
import { demuxProbe, createAudioResource } from "@discordjs/voice";
import { logger } from "../utils/logger/logger.mjs";
import { Item } from "../queue/Item.mjs";
import { spawn } from "child_process";

export class YtDlpExtractError extends Error {
  constructor(message, url) {
    super(message);
    this.name = "YtDlpExtractError";
    this.url = url;
  }
}

export class InvalidStreamUrl extends Error {
  constructor(message, url) {
    super(message);
    this.name = "noStreamUrlError";
    this.url = url;
  }
}

async function probeAndCreateResource(readableStream) {
  const { stream, type } = await demuxProbe(readableStream);
  return createAudioResource(stream, { inputType: type });
}
import { IUrlExtractor } from "./UrlExtractor.mjs";
import { Readable } from "stream";
export default class Yt_dlp_Extractor extends IUrlExtractor {
  constructor(options = null) {
    super();
    // Video urls expire after 6 hours usually.
    this.expirationTime = 60 * 50 * 6;
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

  async requestItems(url) {
    logger.debug("Getting URLs from:", url);
    const urlType = this._validateUrl(url);
    if (urlType.type === "single") {
      logger.debug("Single URL detected");
      let metadata = await this.getSingleMetadata(url);
      let item = new Item(url, metadata.requested_downloads[0].url, metadata);
      return [item];
    } else if (urlType.type === "playlist") {
      // TODO: Single and playlist should be handled the same way
      logger.debug("Getting playlist metadata");
      let metadata = await this.getPlaylistMetadata(url);
      let items = this.getPlaylistItems(metadata);
      this._resolveItems(items);
      return 0;
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

    return metadata;
  }
  // This is a batch process. We do not want to load all the metadata at once
  // for all the items in the playlist.
  // We will count the total time and stop requesting items
  // when the total time is reached. Let the queue handle
  // when should we resolve new items.

  async _resolveItems(items) {
    let urls = [];
    let metadatas = [];
    for (let i = 0; i < items.length; i++) {
      let url = items[i].original_url;
      urls.push(url);
      metadatas.push(items[i].metadata);
    }
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
        detached: false,
        stdio: ["ignore", "pipe", "pipe"], // ["stdin", "stdout", "stderr"]
      }
    );
    let databuffer = "";
    let url_index = 0;
    let acumulated_duration = 0;
    child_spawn.stdout.on("data", async (data) => {
      //child_spawn.stdout.pause();
      let dataString = data.toString();
      databuffer += dataString;
      let newlineIndex;
      while ((newlineIndex = databuffer.indexOf("\n")) !== -1) {
        //logger.debug("New line found");
        const str_metadata = databuffer.substring(0, newlineIndex);
        //logger.debug(`Metadata: ${str_metadata}`);
        databuffer = databuffer.substring(newlineIndex + 1);
        //logger.debug(`Buffer: ${databuffer}`);
        try {
          if (str_metadata === "" || str_metadata == "null") {
            logger.warn("Empty line while parsing JSON, item unavailable");
            url_index += 1;
            continue;
          }
          let url = urls[url_index];
          let metadata = JSON.parse(str_metadata);
          if (!metadata.requested_downloads) {
            logger.error(`Invalid metadata for song: ${url}`);
          }
          // Retrieve item
          let item = items[url_index];
          // Update the item
          item.metadata = metadata;
          item.stream_url = metadata.requested_downloads[0].url;
          this.emit("resolve", item);
          url_index += 1;
          // Sum up the duration of the items
          if (metadata.duration) {
            acumulated_duration += metadata.duration;
          } else {
            logger.warn(`No duration found for item: ${url}`);
          }
          // Check if the total duration is greater than the limit
          if (acumulated_duration > this.expirationTime) {
            logger.debug(
              `Total duration of ${acumulated_duration} seconds reached. Stopping item resolution.`
            );
            this.emit("end");
            child_spawn.kill();
            break;
          }
        } catch (error) {
          logger.error(`Error parsing JSON: ${error}`);
        }
      }
      //child_spawn.stdout.resume();
    });
    child_spawn.stderr.on("data", (data) => {
      logger.error(`Error: ${data}`);
    });
    child_spawn.on("close", (code) => {
      if (databuffer.length > 0) {
        logger.error("Error: Buffer not empty");
        throw new Error("Buffer not empty");
      }
      // if there are any urls left, we need to resolve them
      if (url_index < urls.length) {
        logger.debug(
          `Not all URLs were resolved. ${urls.length - url_index} left.`
        );
        for (let i = url_index; i < urls.length; i++) {
          let item = items[i];
          this.emit("resolve", item);
        }
      }
      if (code !== 0) {
        logger.error(`Child process exited with code ${code}`);
      }
    });

    child_spawn.on("error", (err) => {
      throw new Error(`Child process error: ${err}`);
    });
  }

  getPlaylistUrls(metadata) {
    let urls = [];
    for (const item of metadata.entries) {
      if (item.url) {
        if (item.channel !== null && item.title !== "[Deleted video]") {
          urls.push(item.url);
        }
      }
    }
    return urls;
  }

  getPlaylistItems(metadata) {
    let items = [];
    for (const entry of metadata.entries) {
      if (entry.url) {
        if (entry.channel !== null && entry.title !== "[Deleted video]") {
          let item = new Item(entry.url, null, entry);
          items.push(item);
        }
      }
    }
    return items;
  }
  // Method to create a stream from the URL
  createStream(url) {
    logger.debug("Creating stream from URL:", url);
    return fetch(url).then((response) => {
      if (!response.ok) {
        logger.error("Error fetching stream URL:", response.statusText);
        logger.error("URL:", url);
        throw new InvalidStreamUrl("Failed to fetch stream url", url);
      }
      return Readable.fromWeb(response.body);
    });
  }
  async createAudioResource(url) {
    if (!url) {
      throw new InvalidStreamUrl("No stream URL found.", url);
    }
    logger.debug(`creating audio resource from URL: ${url}`);
    const stream = await this.createStream(url);
    return await probeAndCreateResource(stream);
  }
}
