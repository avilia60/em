import { store } from '../store'
import { Context, Lexeme, ParentEntry, Snapshot } from '../types'
import { hashContext, hashThought, mergeThoughts, never, pathToContext, unroot } from '../util'
import { ThoughtsInterface } from '../util/initialState'

interface Options {
  maxDepth?: number,
}

/** Gets the Lexeme object of a value. */
export const getThought = async (value: string): Promise<Lexeme> => {
  const userId = store.getState().user.uid
  const ref = window.firebase.database().ref(`users/${userId}/thoughtIndex/${hashThought(value)}`)
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<Lexeme>) => {
    resolve(snapshot.val())
  }))
}

/**
 * Fetches a ParentEntry of a context.
 *
 * @param context
 */
export const getContext = async (context: Context): Promise<ParentEntry> => {
  const userId = store.getState().user.uid
  const ref = window.firebase.database().ref(`users/${userId}/contextIndex/${hashContext(context)}`)
  return new Promise(resolve => ref.once('value', (snapshot: Snapshot<ParentEntry>) => {
    resolve(snapshot.val())
  }))
}

/**
 * Fetches all descendants of a context and returns them within a ThoughtsInterface.
 *
 * @param context
 * @param maxDepth    The maximum number of levels to traverse. Default: 100.
 */
export const getDescendantThoughts = async (context: Context, { maxDepth = 100 }: Options = {}): Promise<ThoughtsInterface> => {

  if (maxDepth === 0) return { contextIndex: {}, thoughtIndex: {} }

  const parentEntry: ParentEntry = maxDepth > 0
    ? await getContext(context) || {
      children: [],
      lastUpdated: never()
    }
    : {
      children: [],
      lastUpdated: never(),
      pending: true,
    }

  // initially set the contextIndex for the given context
  // if there are no children, still set this so that pending is overwritten
  const initialThoughts = {
    contextIndex: {
      [hashContext(context)]: parentEntry
    },
    thoughtIndex: {},
  }

  // recursively iterate over each child
  // @ts-ignore
  return (parentEntry.children || []).reduce(async (thoughtsPromise: Promise<ThoughtsInterface>, child: Child) => {
    const thoughts = await thoughtsPromise
    const thoughtEncoded = hashThought(child.value)
    const thought = await getThought(child.value) // TODO: Cache thoughts that have already been loaded
    const contextChild = unroot([...context, child.value])

    // RECURSION
    const nextDescendantThoughts = await getDescendantThoughts(contextChild, { maxDepth: maxDepth - 1 })

    // merge descendant thoughtIndex and add child thought
    return mergeThoughts(thoughts, nextDescendantThoughts, {
      thoughtIndex: {
        [thoughtEncoded]: thought,
      }
    })
  }, initialThoughts)
}

/** Gets descendants of many contexts, returning them a single ThoughtsInterface. */
export const getManyDescendants = async (contextMap: any, { maxDepth = 100 }: Options = {}): Promise<ThoughtsInterface> => {

  // fetch descendant thoughts for each context in contextMap
  const descendantsArray = await Promise.all(Object.keys(contextMap).map(key =>
    getDescendantThoughts(pathToContext(contextMap[key]), { maxDepth })
  ))

  // aggregate thoughts from all descendants
  const thoughts = descendantsArray.reduce((accum, thoughts) => mergeThoughts(accum, thoughts), { contextIndex: {}, thoughtIndex: {} })

  return thoughts
}
