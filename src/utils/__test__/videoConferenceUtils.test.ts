import { generateMeetingId, generateMeetingLink, addVideoConferenceToDescription, extractVideoConferenceFromDescription } from '../videoConferenceUtils';

describe('videoConferenceUtils', () => {
  describe('generateMeetingId', () => {
    it('should generate meeting ID in correct format', () => {
      const meetingId = generateMeetingId();
      expect(meetingId).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    });

    it('should generate different IDs each time', () => {
      const id1 = generateMeetingId();
      const id2 = generateMeetingId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateMeetingLink', () => {
    it('should generate link with default base URL', () => {
      const link = generateMeetingLink();
      expect(link).toMatch(/^https:\/\/meet\.linagora\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    });

    it('should generate link with custom base URL', () => {
      const customBase = 'https://custom-meet.example.com';
      const link = generateMeetingLink(customBase);
      expect(link).toMatch(/^https:\/\/custom-meet\.example\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
    });
  });

  describe('addVideoConferenceToDescription', () => {
    it('should add video conference footer to empty description', () => {
      const description = '';
      const meetingLink = 'https://meet.linagora.com/abc-defg-hij';
      const result = addVideoConferenceToDescription(description, meetingLink);
      expect(result).toBe('\n\nVisio: https://meet.linagora.com/abc-defg-hij');
    });

    it('should add video conference footer to existing description', () => {
      const description = 'This is a meeting description.';
      const meetingLink = 'https://meet.linagora.com/abc-defg-hij';
      const result = addVideoConferenceToDescription(description, meetingLink);
      expect(result).toBe('This is a meeting description.\n\nVisio: https://meet.linagora.com/abc-defg-hij');
    });
  });

  describe('extractVideoConferenceFromDescription', () => {
    it('should extract video conference link from description', () => {
      const description = 'Meeting description.\n\nVisio: https://meet.linagora.com/abc-defg-hij';
      const result = extractVideoConferenceFromDescription(description);
      expect(result).toBe('https://meet.linagora.com/abc-defg-hij');
    });

    it('should return null when no video conference link found', () => {
      const description = 'Just a regular meeting description.';
      const result = extractVideoConferenceFromDescription(description);
      expect(result).toBeNull();
    });

    it('should return null for empty description', () => {
      const description = '';
      const result = extractVideoConferenceFromDescription(description);
      expect(result).toBeNull();
    });
  });
});
