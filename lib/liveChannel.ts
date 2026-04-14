/**
 * liveChannel.ts
 * Typed BroadcastChannel helper for the Live Event Display system.
 *
 * Admin tab       → sends commands via sendLiveCommand()
 * Projector tab   → listens via useLiveChannel() hook
 */

import { useEffect, useRef } from 'react';
import { StudentProfile } from '../types';

export const CHANNEL_NAME = 'spelling-bee-live';

// ─── Command Types ────────────────────────────────────────────────────────────

export type PodiumEntry = { position: 1 | 2 | 3; student: StudentProfile };

export type LiveCommand =
    | { type: 'standby' }
    | { type: 'leaderboard' }
    | { type: 'team-reveal'; students: StudentProfile[]; grade: number }
    | { type: 'spotlight'; student: StudentProfile }
    | { type: 'slideshow'; students: StudentProfile[]; grade: number; intervalMs: number }
    | { type: 'podium'; entries: PodiumEntry[] }
    | { type: 'ping' }
    | { type: 'pong' };

// ─── Send a command from the admin tab ───────────────────────────────────────

export function sendLiveCommand(cmd: LiveCommand): void {
    try {
        const ch = new BroadcastChannel(CHANNEL_NAME);
        ch.postMessage(cmd);
        ch.close();
    } catch (e) {
        console.warn('BroadcastChannel not available', e);
    }
}

// ─── React hook: listen for commands on the projector tab ────────────────────

export function useLiveChannel(onMessage: (cmd: LiveCommand) => void): void {
    const cbRef = useRef(onMessage);
    cbRef.current = onMessage;

    useEffect(() => {
        let ch: BroadcastChannel;
        try {
            ch = new BroadcastChannel(CHANNEL_NAME);
            ch.onmessage = (e: MessageEvent<LiveCommand>) => {
                cbRef.current(e.data);
            };
        } catch (e) {
            console.warn('BroadcastChannel not available', e);
        }
        return () => { ch?.close(); };
    }, []);
}
