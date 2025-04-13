import Yt_dlp_Extractor from '../extractor/Yt-dlp_Extractor.mjs';
import EventEmitter from 'events';
import { AudioPlayerStatus } from '@discordjs/voice';
import {YtDlpExtractError} from '../extractor/Yt-dlp_Extractor.mjs';

class Queue extends EventEmitter {
    constructor(player, urlExtractor=null, loop = false) {
        super();
        this.loop = loop;
        this.player = player;
        this.items = [];
        this.ended = false;
        this.on('play', () => {
            // get player status
            if (this.player.state.status === AudioPlayerStatus.Idle) {
                this.playNext();
            }
        });
        this.player.on('stateChange', (oldState, newState) => {
            if (oldState.status === AudioPlayerStatus.Playing && newState.status === AudioPlayerStatus.Idle) {
                if (this.ended) {
                    this.emit('queueEnd');
                }else{
                    this.playNext();
                }
            }
            if (newState.status === AudioPlayerStatus.Playing) {
                this.emit('playing');
            }
            if (newState.status === AudioPlayerStatus.Paused) {
                this.emit('paused');
            }
            if (newState.status === AudioPlayerStatus.Buffering) {
                this.emit('buffering');
            }
            if (newState.status === AudioPlayerStatus.Error) {
                this.emit('error');
            }
        });
        this.pointer = 0;
        if (!urlExtractor) {
            this.urlExtractor = new Yt_dlp_Extractor();
        }
        
    }

    
    // Set the loop mode
    setLoop(loop) {
        this.loop = loop;
    }
    // Play the last item that was queued
    replay() {
        if (this.isEmpty()) {
            this.emit('queueEnd');
            this.ended = true;
            return;
        }
        this.pointer--;
        if (this.pointer < 0) {
            this.pointer = 0;
        }
        const url = this.items[this.pointer].orig_url;
        console.log('Replaying item:', url);
        try{
            const resource = this.urlExtractor.createAudioResource(url);
            this.player.stop(true);
            this.player.play(resource);
        }catch (error) {
            if (error instanceof YtDlpExtractError) {
                console.error('Error extracting URL:', error);
                this.playNext();
            } else {
                console.error('Unexpected error:', error);
            }
        }
    }
    stop() {
        // clear the queue
        this.items = [];
        this.pointer = 0;
        this.ended = true;
        this.player.stop(true);
        this.emit('queueEnd');
    }
    skip(to) {
        if (this.isEmpty()) {
            this.emit('queueEnd');
            this.ended = true;
            return;
        }
        if (to) {
            // TODO return and catch errors in the command
            if (to >= this.items.length) {
                to = this.items.length - 1;
            }
            if (to < 0) {
                to = 0;
            }
            this.pointer = to-1;
        } else {
            this.pointer++;
        }
        this.player.stop(true);
    }
    // Play the next item in the queue
    async playNext() {
        if (this.isEmpty()) {
            this.emit('queueEnd');
            this.ended = true;
            this.pointer = 0;
            return;
        }
        if (this.pointer >= this.items.length) {
            if (this.loop) {
                this.pointer = 0;
            } else {
                this.emit('queueEnd');
                this.ended = true;
                return;
            }
        }
        if(this.ended){
            this.emit('queueEnd');
            this.pointer = 0;
            return;
        }
        const url = this.items[this.pointer].orig_url;
        console.log('Playing next item:', url);
        this.pointer++;
        try{
            const resource = await this.urlExtractor.createAudioResource(url);
                            
            this.player.stop(true)
            this.player.play(resource);
        }catch (error) {
            if (error instanceof YtDlpExtractError) {
                console.error('Error extracting URL:', error);
                this.playNext();
            } else {
                console.error('Unexpected error:', error);
            }
        }
    }
    // Add an item to the queue
    // Could be a single URL or an array of URLs
    enqueue(items) {
        if (Array.isArray(items)) {
            for (const item of items) {
                this._enqueueSingle(item);
            }
        } else {
            this._enqueueSingle(items);
        }
    }
    _enqueueSingle(item) {
        if (this.items.length === 0) {
            this.pointer = 0;
        }
        this.ended = false;
        this.items.push(item);
        this.emit('added', item);
    }

    // Peek at the first item without removing it
    peek() {
        if (this.isEmpty()) {
            throw new Error('Queue is empty');
        }
        return this.items[this.pointer];
    }

    // Check if the queue is empty
    isEmpty() {
        return this.items.length === 0;
    }

    // Get the size of the queue
    size() {
        return this.items.length;
    }

}

export default Queue;