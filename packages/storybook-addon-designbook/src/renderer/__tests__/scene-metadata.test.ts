import { describe, it, expect } from 'vitest';
import { extractGroup, buildExportName, extractScenes, fileBaseName } from '../scene-metadata';

describe('scene-metadata', () => {
  describe('extractGroup', () => {
    it('returns parsed name when present', () => {
      expect(extractGroup({ name: 'Designbook/Sections/Blog' }, 'blog')).toBe('Designbook/Sections/Blog');
    });

    it('falls back to fileBase when name is missing', () => {
      expect(extractGroup({}, 'blog')).toBe('blog');
    });

    it('falls back to fileBase when name is empty string', () => {
      expect(extractGroup({ name: '' }, 'blog')).toBe('blog');
    });
  });

  describe('buildExportName', () => {
    it('converts space-separated name', () => {
      expect(buildExportName('Ratgeber Detail')).toBe('RatgeberDetail');
    });

    it('converts hyphen-separated name', () => {
      expect(buildExportName('pet-discovery-listing')).toBe('PetDiscoveryListing');
    });

    it('converts mixed separators', () => {
      expect(buildExportName('my-great scene')).toBe('MyGreatScene');
    });

    it('handles single word', () => {
      expect(buildExportName('overview')).toBe('Overview');
    });
  });

  describe('extractScenes', () => {
    it('returns scenes array when present', () => {
      const parsed = { scenes: [{ name: 'A' }, { name: 'B' }] };
      expect(extractScenes(parsed)).toEqual([{ name: 'A' }, { name: 'B' }]);
    });

    it('wraps entire object as legacy format', () => {
      const parsed = { name: 'Legacy', layout: {} };
      expect(extractScenes(parsed)).toEqual([parsed]);
    });

    it('wraps when scenes is not an array', () => {
      const parsed = { name: 'Test', scenes: 'invalid' };
      expect(extractScenes(parsed)).toEqual([parsed]);
    });
  });

  describe('fileBaseName', () => {
    it('extracts base from full path', () => {
      expect(fileBaseName('/path/to/ratgeber.scenes.yml')).toBe('ratgeber');
    });

    it('handles filename only', () => {
      expect(fileBaseName('blog.scenes.yml')).toBe('blog');
    });
  });
});
