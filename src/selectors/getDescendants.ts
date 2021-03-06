import _ from 'lodash'
import { head, unroot } from '../util'
import { getThoughtsRanked } from '../selectors'
import { State } from '../util/initialState'
import { Child, SimplePath } from '../types'

/** Generates a flat list of all descendants. */
const getDescendants = (state: State, path: SimplePath, recur?: boolean/* INTERNAL */): Child[] => {
  const children = getThoughtsRanked(state, path)
  // only append current thought in recursive calls
  return (recur ? [head(path)] : []).concat(
    _.flatMap(children, child => getDescendants(state, unroot(path.concat(child) as SimplePath), true))
  )
}

export default getDescendants
