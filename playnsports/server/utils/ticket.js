import crypto from 'crypto';

// Human-readable, unique-enough ticket ID for event check-in.
// Format: SPT-XXXXXXXX (8 chars from a 32-char alphabet with no 0/O/1/I/L —
// avoids characters people misread when copying a ticket off a phone
// screen or a printed page at the door).
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const generateTicketId = () => {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `SPT-${code}`;
};
