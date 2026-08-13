// ─────────────────────────────────────────────────────────────
// Phone number privacy helpers.
//
// Every user (any role) has a `hidePhoneNumber` flag on their User document
// (and coaches additionally have one on their Coach document, since a coach
// profile can list a different contact number). It defaults to `true` —
// phone numbers are private unless the owner explicitly opts in to show it.
//
// These helpers strip `phone` from populated sub-documents / plain objects
// before a response is sent, unless the requester IS the owner.
// ─────────────────────────────────────────────────────────────

const resolveOwnerId = (ownerRef) => {
  if (!ownerRef) return null;
  if (typeof ownerRef === 'object' && ownerRef._id) return String(ownerRef._id);
  return String(ownerRef);
};

// Convert a Mongoose document (or array of documents) into plain object(s)
// so fields can be safely deleted before sending the response.
export const toPlain = (doc) => {
  if (Array.isArray(doc)) return doc.map(toPlain);
  if (!doc) return doc;
  return typeof doc.toObject === 'function' ? doc.toObject() : doc;
};

// Deletes `phone` (and the internal `hidePhoneNumber` flag) from a plain
// object unless the viewer IS the owner, or the owner has explicitly chosen
// to make their number public (hidePhoneNumber === false).
export const scrubPhoneField = (obj, viewerId, ownerRef) => {
  if (!obj) return obj;
  const ownerId = resolveOwnerId(ownerRef);
  const isSelf = viewerId && ownerId && String(viewerId) === ownerId;
  if (!isSelf && obj.hidePhoneNumber !== false) {
    delete obj.phone;
  }
  delete obj.hidePhoneNumber;
  return obj;
};

// Scrub a nested populated field (e.g. `user`, `owner`, `organizer`) on one
// document or an array of documents. Assumes the nested field's own `_id`
// IS the owning user's id (true for populate('user', ...), populate('owner', ...), etc).
// Returns plain object(s), safe to res.json() directly.
export const scrubNestedPhone = (docOrDocs, field, viewerId) => {
  const plain = toPlain(docOrDocs);
  const list = Array.isArray(plain) ? plain : [plain];
  list.forEach((doc) => {
    if (doc && doc[field]) {
      scrubPhoneField(doc[field], viewerId, doc[field]._id);
    }
  });
  return plain;
};

// Scrub an Event (or array of Events): the organizer field + every entry in
// the participants array, each against its own hidePhoneNumber preference.
export const scrubEventPhones = (eventOrEvents, viewerId) => {
  const plain = toPlain(eventOrEvents);
  const list = Array.isArray(plain) ? plain : [plain];
  list.forEach((event) => {
    if (!event) return;
    if (event.organizer) scrubPhoneField(event.organizer, viewerId, event.organizer._id);
    if (Array.isArray(event.participants)) {
      event.participants.forEach((p) => {
        if (p.user) scrubPhoneField(p.user, viewerId, p.user._id);
      });
    }
    if (Array.isArray(event.subEvents)) {
      event.subEvents.forEach((se) => {
        if (Array.isArray(se.bookings)) {
          se.bookings.forEach((b) => {
            if (b.user) scrubPhoneField(b.user, viewerId, b.user._id);
          });
        }
      });
    }
  });
  return plain;
};
