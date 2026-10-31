export class Item {
  /**
   * @param {string} original_url - The original URL of the item.
   * @param {string|null} stream_url - The streaming URL of the item, or null
   *   for a playlist item whose stream URL has not been resolved yet.
   * @param {object} metadata - Additional metadata for the item.
   */
  constructor(original_url, stream_url, metadata) {
    this.original_url = original_url;
    this.stream_url = stream_url;
    this.metadata = metadata;
  }
}
