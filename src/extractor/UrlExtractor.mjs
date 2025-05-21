// Interface for UrlExtractor
import { EventEmitter } from "events";

export class IUrlExtractor extends EventEmitter {
  constructor() {
    super();
    this.options = null;
  }
  /**
   * Method to get the URL of the stream (readable resource)
   * @param {string} url - The URL to extract audio from
   * @returns {Promise<string>} - The extracted audio URL
   */
  async getStreamUrl(url) {}
  /**
   * Method to get the original URLs from the playlist
   * link, in order to queue them.
   * @param {string} url - The URL to extract audio from
   * @returns {Promise<string>} - The extracted audio URL
   */
  async getUrls(url) {}
  /**
   * Method to get the metadata of the URL, that is at least
   * url, title and type.
   * @param {string} url - The URL to validate
   * @returns {Object} - An object containing the type of the URL
   */
  async getMetadata(url) {}
  /**
   * Method to create a stream from the URL
   * @param {string} url - The URL to create a stream from
   * @returns {Promise<Readable>} - The readable stream
   */
  createStream(url) {}

  /**
   * Method to create an audio resource from the URL
   * @param {string} url - The URL to create an audio resource from
   * @returns {Promise<AudioResource>} - The audio resource
   */
  createAudioResource(url) {}
}
