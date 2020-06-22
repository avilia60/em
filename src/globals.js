/**
 * THE BAD PLACE where mutable globals are defined.
 */
/* eslint-disable fp/no-let */

/**
 * Track whether the user is touching the screen so that we can distinguish touchend events from tap or drag. Not related to react-dnd.
 */
let touching

/** Track complete touch event in order to prevent react-dnd from initiating drag during scroll on first page load. */
let touched

/** Track whether the page has rendered yet to simulate onload event. */
let rendered

/** Set to offline mode OFFLINE_TIMEOUT milliseconds after startup. Cancelled with successful login. */
let offlineTimer

/** Clear error ERROR_TIMEOUT milliseconds after firing. Cancelled if closed manually. */
let errorTimer

/** When the Meta/Control key is held for more than SUPPRESS_EXPANSION_DELAY milliseconds, then subthoughts will not be expanded. It is also immediately activated on cursorNext or cursorPrev. This allows desktop users to navigate siblings easier when they have lots of subthoughts. */
let suppressExpansion = false // eslint-disable-line prefer-const

/** These aren's so bad. They're for debugging. */

/** Simulate dragging and hovering over all drop targets for debugging. */
const simulateDrag = false
/** Simulate dragging and hovering over all drop targets for debugging. */
const simulateDropHover = false

/** Disable the tutorial for debugging. */
const disableTutorial = false

/** Disable key hashing for easier debugging of thoughtIndex and contextIndex. */
const disableThoughtHashing = false

/** Ellipsize the thoughts in the context view. They can be expanded by clicking on the ellipsis. */
// TODO: Default to false but add a setting to enable.
const ellipsizeContextThoughts = false

/** Check duplicate ranks within the same context for debugging. React prints a warning, but it does not show which thoughts are colliding. */
const checkDuplicateRanks = false

export default {
  checkDuplicateRanks,
  disableThoughtHashing,
  disableTutorial,
  ellipsizeContextThoughts,
  errorTimer,
  offlineTimer,
  rendered,
  simulateDrag,
  simulateDropHover,
  suppressExpansion,
  touched,
  touching,
}
