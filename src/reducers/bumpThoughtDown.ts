import _ from 'lodash'
import { existingThoughtChange, existingThoughtMove, newThoughtSubmit, setCursor, subCategorizeOne } from '../reducers'
import { getPrevRank, getRankBefore, getThoughts, simplifyPath } from '../selectors'
import { contextOf, headValue, pathToContext, reducerFlow, rootedContextOf, unroot } from '../util'
import { State } from '../util/initialState'
import { Path, SimplePath } from '../types'

/** Clears a thought's text, moving it to its first child. */
const bumpThoughtDown = (state: State, { path }: { path?: Path }) => {
  path = path || state.cursor as Path
  const value = path && headValue(path)

  // const rank = headRank(path)
  const children = getThoughts(state, pathToContext(path))

  // if there are no children
  if (children.length === 0) return subCategorizeOne(state)

  // TODO: Resolve thoughtsRanked to make it work within the context view
  // Cannot do this without the contextChain
  // Need to store the full thoughtsRanked of each path segment in the path
  const thoughtsRanked = simplifyPath(state, path)
  const context = pathToContext(thoughtsRanked)
  const parentRanked = unroot(contextOf(thoughtsRanked))

  // modify the rank to get the thought to re-render (via the Subthoughts child key)
  // this should be fixed
  const thoughtsRankedWithNewRank = [...parentRanked, { value, rank: getRankBefore(state, thoughtsRanked) }] as SimplePath
  const thoughtsRankedWithNewRankAndValue = [...parentRanked, { value: '', rank: getRankBefore(state, thoughtsRanked) }] as Path

  return reducerFlow([

    // modify the rank to get the thought to re-render (via the Subthoughts child key)
    existingThoughtMove({
      oldPath: thoughtsRanked,
      newPath: thoughtsRankedWithNewRank,
    }),

    // clear text
    existingThoughtChange({
      oldValue: value,
      newValue: '',
      context: rootedContextOf(context),
      thoughtsRanked: thoughtsRankedWithNewRank
    }),

    // new thought
    state => {
      // the context of the new empty thought
      const contextEmpty = pathToContext(thoughtsRankedWithNewRankAndValue as Path)
      return newThoughtSubmit(state, {
        context: contextEmpty,
        rank: getPrevRank(state, contextEmpty),
        value,
      })
    },

    // set cursor
    setCursor({
      thoughtsRanked: thoughtsRankedWithNewRankAndValue,
    }),

  ])(state)
}

export default _.curryRight(bumpThoughtDown)
