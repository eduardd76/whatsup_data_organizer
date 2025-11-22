import {
  extractUrls,
  isYouTubeUrl,
  extractYouTubeVideoId,
  normalizeUrl,
} from '../../utils/url';

describe('URL Utilities', () => {
  describe('extractUrls', () => {
    it('should extract URLs from text', () => {
      const text = 'Check out https://example.com and http://test.org';
      const urls = extractUrls(text);

      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('http://test.org');
    });

    it('should return empty array when no URLs present', () => {
      const text = 'This is just plain text';
      const urls = extractUrls(text);

      expect(urls).toHaveLength(0);
    });
  });

  describe('isYouTubeUrl', () => {
    it('should identify standard YouTube URL', () => {
      expect(isYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    });

    it('should identify short YouTube URL', () => {
      expect(isYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    });

    it('should identify embed YouTube URL', () => {
      expect(isYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
    });

    it('should reject non-YouTube URL', () => {
      expect(isYouTubeUrl('https://example.com')).toBe(false);
    });
  });

  describe('extractYouTubeVideoId', () => {
    it('should extract video ID from standard URL', () => {
      const id = extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should extract video ID from short URL', () => {
      const id = extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ');
      expect(id).toBe('dQw4w9WgXcQ');
    });

    it('should return null for invalid URL', () => {
      const id = extractYouTubeVideoId('https://example.com');
      expect(id).toBeNull();
    });
  });

  describe('normalizeUrl', () => {
    it('should remove tracking parameters', () => {
      const url = 'https://example.com/page?utm_source=test&utm_medium=email&id=123';
      const normalized = normalizeUrl(url);

      expect(normalized).toBe('https://example.com/page?id=123');
    });

    it('should remove fragment', () => {
      const url = 'https://example.com/page#section';
      const normalized = normalizeUrl(url);

      expect(normalized).toBe('https://example.com/page');
    });

    it('should handle invalid URLs gracefully', () => {
      const url = 'not-a-valid-url';
      const normalized = normalizeUrl(url);

      expect(normalized).toBe(url);
    });
  });
});
