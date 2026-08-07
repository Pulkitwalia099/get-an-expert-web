// The class PostHog treats as "never record this element". Session replay
// captures the conversation now, so anything holding a real contact detail has
// to opt out by name rather than by us remembering to.
//
// Defined once and imported, because the protection is a string match: a typo
// is not a type error and would fail silently, recording the very field it was
// added to protect. Anything carrying a visitor's personal details gets this.
export const NO_CAPTURE = 'ph-no-capture';
