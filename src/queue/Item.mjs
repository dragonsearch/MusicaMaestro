export class Item {
  /**
   * @param {string} original_url - The original URL of the item.
   * @param {string} stream_url - The streaming URL of the item.
   * @param {object} metadata - Additional metadata for the item.
   */
  constructor(original_url, stream_url, metadata) {
    this.original_url = original_url;
    this.stream_url = stream_url;
    this.metadata = metadata;
  }
}
