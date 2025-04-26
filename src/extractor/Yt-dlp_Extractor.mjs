import youtubedl from "youtube-dl-exec";
import { demuxProbe, createAudioResource } from "@discordjs/voice";

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
import { IUrlExtractor } from "./UrlExtractor.mjs";
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
    //TODO: RETHINK THIS. This should probably be handled outside of the
    // queue and outside of this class, in the command.
    const urlType = this._validateUrl(url);
    if (urlType.type === "single") {
      return await this.getStreamSingleUrl(url);
    } else if (urlType.type === "playlist") {
      // needs to be handled, unnecessary following the queue logic but
      // could be useful
      return await this.getStreamSingleUrl(this.getPlaylistUrls(url)[0]);
    } else {
      throw new Error("Invalid URL");
    }
  }

  async getItems(url) {
    console.log("Getting URLs from:", url);
    const urlType = this._validateUrl(url);
    if (urlType.type === "single") {
      console.log("Single URL detected");
      // TODO refactor
      let metadata = await this.getSingleMetadata(url);
      let item = {
        orig_url: url,
        metadata: metadata,
      };
      return [item];
    } else if (urlType.type === "playlist") {
      console.log("Playlist URL detected");
      let metadata = await this.getPlaylistMetadata(url);
      let items = this.getPlaylistItems(metadata);
      return items;
    } else {
      throw new Error("Invalid URL");
    }
  }
  async getMetadata(url) {
    console.log("Getting metadata from:", url);
    const urlType = this._validateUrl(url);
    if (urlType.type === "single") {
      console.log("Single URL detected");
      return await this.getSingleMetadata(url);
    } else if (urlType.type === "playlist") {
      console.log("Playlist URL detected");
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
      console.error("Error getting metadata:", err);
      throw new YtDlpExtractError("Failed to extract metadata", url);
    }
  }

  // Method to get the URL using yt-dlp
  async getStreamSingleUrl(url) {
    try {
      let resource = await youtubedl(url, this.options);
      return resource.requested_downloads[0].url;
    } catch (err) {
      console.error("Error getting stream URL:", err);
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
    console.log("Creating stream from URL:", url);
    return fetch(url).then((r) => Readable.fromWeb(r.body));
  }
  async createAudioResource(url) {
    url = await this.getStreamUrl(url);
    const stream = await this.createStream(url);
    return probeAndCreateResource(stream);
  }
}
