import { describe, it, expect } from 'bun:test';
import React from 'react';
import { ConnectionPill } from '../components/connection-pill';

describe('Real-Time Connection Health Pill Component', () => {
  it('renders Live Sync indicator when connected', () => {
    const el = ConnectionPill({ isConnected: true });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Connected to Live Queue Engine');
  });

  it('renders Reconnecting state when reconnection attempts are active', () => {
    const el = ConnectionPill({ isConnected: false, reconnectAttempts: 2 });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Reconnecting to Live Engine (Attempt 2/5)');
  });

  it('renders Offline Cache mode when fully disconnected without active reconnection', () => {
    const el = ConnectionPill({ isConnected: false, reconnectAttempts: 0 });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Operating in Offline Cache Mode');
  });
});
