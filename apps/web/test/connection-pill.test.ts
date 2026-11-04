import { describe, it, expect } from 'bun:test';
import React from 'react';
import { ConnectionPill } from '../components/connection-pill';

describe('Real-Time Connection Health Pill Component', () => {
  it('renders Live Sync indicator when connected', () => {
    const el = ConnectionPill({ isConnected: true });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Connected to Live Queue Engine');
  });

  it('renders Connecting state when status is explicitly connecting', () => {
    const el = ConnectionPill({ status: 'connecting' });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Connecting to Live Queue Engine');
  });

  it('renders Reconnecting state when reconnection attempts are active', () => {
    const el = ConnectionPill({ isConnected: false, reconnectAttempts: 2 });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Reconnecting to Live Engine (Attempt 2/5)');
  });

  it('renders Reconnecting state when status is explicitly reconnecting', () => {
    const el = ConnectionPill({ status: 'reconnecting', reconnectAttempts: 3 });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Reconnecting to Live Engine (Attempt 3/5)');
  });

  it('renders Offline Cache mode when fully disconnected without active reconnection', () => {
    const el = ConnectionPill({ isConnected: false, reconnectAttempts: 0 });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Operating in Offline Cache Mode');
  });

  it('renders Offline Cache mode when status is explicitly offline', () => {
    const el = ConnectionPill({ status: 'offline' });
    expect(el).toBeDefined();
    expect(el.props.title).toContain('Operating in Offline Cache Mode');
  });
});
