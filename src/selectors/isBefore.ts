import { contextOf, headRank, headValue } from '../util'
import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { SimplePath } from '../types'

/** Returns true if thoughtsA comes immediately before thoughtsB.
 * Assumes they have the same context.
 */
const isBefore = (state: State, simplePathA: SimplePath, simplePathB: SimplePath) => {

  const valueA = headValue(simplePathA)
  const rankA = headRank(simplePathA)
  const valueB = headValue(simplePathB)
  const rankB = headRank(simplePathB)
  const context = contextOf(simplePathA)
  const children = getThoughtsRanked(state, context)

  if (children.length === 0 || valueA === undefined || valueB === undefined) {
    return false
  }

  const i = children.findIndex(child => child.value === valueB && child.rank === rankB)
  const prevSubthought = children[i - 1]
  return prevSubthought && prevSubthought.value === valueA && prevSubthought.rank === rankA
}

export default isBefore
