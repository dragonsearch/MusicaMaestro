export interface QueueState {
    play(): void;
    pause(): void;
    stop(): void;
    next(): void;
    prev(): void;
}

export class PlayingState implements QueueState {
    constructor(private context: QueueContext) {}

    play() {
        // Already playing
    }
    pause() {
        this.context.setState(this.context.pausedState);
    }
    stop() {
        this.context.setState(this.context.stoppedState);
    }
    next() {
        this.context.nextTrack();
    }
    prev() {
        this.context.prevTrack();
    }
}

export class PausedState implements QueueState {
    constructor(private context: QueueContext) {}

    play() {
        this.context.setState(this.context.playingState);
    }
    pause() {
        // Already paused
    }
    stop() {
        this.context.setState(this.context.stoppedState);
    }
    next() {
        this.context.nextTrack();
    }
    prev() {
        this.context.prevTrack();
    }
}

export class StoppedState implements QueueState {
    constructor(private context: QueueContext) {}

    play() {
        this.context.setState(this.context.playingState);
    }
    pause() {
        // Can't pause when stopped
    }
    stop() {
        // Already stopped
    }
    next() {
        this.context.nextTrack();
    }
    prev() {
        this.context.prevTrack();
    }
}

export class QueueContext {
    public playingState: QueueState;
    public pausedState: QueueState;
    public stoppedState: QueueState;
    private state: QueueState;

    constructor() {
        this.playingState = new PlayingState(this);
        this.pausedState = new PausedState(this);
        this.stoppedState = new StoppedState(this);
        this.state = this.stoppedState;
    }

    setState(state: QueueState) {
        this.state = state;
    }

    play() {
        this.state.play();
    }
    pause() {
        this.state.pause();
    }
    stop() {
        this.state.stop();
    }
    next() {
        this.state.next();
    }
    prev() {
        this.state.prev();
    }

    // Placeholder methods for track navigation
    nextTrack() {
        // Implement track navigation logic
    }
    prevTrack() {
        // Implement track navigation logic
    }
}