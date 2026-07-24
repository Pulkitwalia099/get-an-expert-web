import { describe, expect, it } from 'vitest';
import { isSafeWebhookUrl } from '../insights';

describe('isSafeWebhookUrl', () => {
  it('accepts public https endpoints', () => {
    expect(isSafeWebhookUrl('https://hooks.zapier.com/x/y')).toBe(true);
    expect(isSafeWebhookUrl('https://n8n.example.io/webhook/abc')).toBe(true);
  });

  it('rejects plain http and garbage', () => {
    expect(isSafeWebhookUrl('http://hooks.zapier.com/x')).toBe(false);
    expect(isSafeWebhookUrl('ftp://example.com')).toBe(false);
    expect(isSafeWebhookUrl('not a url')).toBe(false);
  });

  it('rejects loopback, private and metadata addresses', () => {
    expect(isSafeWebhookUrl('https://localhost/hook')).toBe(false);
    expect(isSafeWebhookUrl('https://127.0.0.1/hook')).toBe(false);
    expect(isSafeWebhookUrl('https://10.0.0.5/hook')).toBe(false);
    expect(isSafeWebhookUrl('https://192.168.1.1/hook')).toBe(false);
    expect(isSafeWebhookUrl('https://172.16.0.9/hook')).toBe(false);
    expect(isSafeWebhookUrl('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isSafeWebhookUrl('https://[::1]/hook')).toBe(false);
    expect(isSafeWebhookUrl('https://db.internal/hook')).toBe(false);
    expect(isSafeWebhookUrl('https://printer.local/hook')).toBe(false);
  });

  it('still allows public hosts that merely contain private-looking digits', () => {
    expect(isSafeWebhookUrl('https://api.10x.example.com/hook')).toBe(true);
  });
});
