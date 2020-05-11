import { store } from '../store'

// util
import {
  contextOf,
  getThoughts,
  isDocumentEditable,
  pathToContext,
} from '../util'

// action-creators
import { indent } from '../action-creators/indent'
import { cursorDown } from '../action-creators/cursorDown'
import { newThought } from '../action-creators/newThought'

// selectors
import pathToThoughtsRanked from '../selectors/pathToThoughtsRanked'
import attributeEquals from '../selectors/attributeEquals'

export default {
  id: 'moveCursorForward',
  name: 'Move Cursor Forward',
  description: `Move the current thought to the end of the previous thought or to next column in table view.`,
  keyboard: { key: 'Tab' },
  canExecute: () => isDocumentEditable() && store.getState().cursor,
  exec: e => {
    const state = store.getState()
    const { cursor } = state
    const thoughtsRanked = pathToThoughtsRanked(state, cursor)
    const context = pathToContext(thoughtsRanked)
    const contextParent = contextOf(context)
    const isTable = attributeEquals(state, contextParent, '=view', 'Table')
    const hasChildren = getThoughts(context).length > 0

    store.dispatch(isTable ?
      // special case for table
      hasChildren
        // if column 2 exists, move cursor to column 2
        ? cursorDown({ target: e.target })
        // otherwise, create a new subthought
        : newThought({ insertNewSubthought: true })
      // normal indent
      : indent()
    )

  }
}