import * as murmurHash3 from 'murmurhash3js'
import globals from '../globals'
import { ID } from '../constants'

// util
import { escapeSelector } from './escapeSelector'
import { pathToContext } from './pathToContext'
import { Context, ContextHash, Path } from '../types'

const SEPARATOR_TOKEN = '__SEP__'

/** Encode the thoughts (and optionally rank) as a string. */
export const hashContext = (thoughts: Context | Path, rank?: number): ContextHash => (globals.disableThoughtHashing ? ID : murmurHash3.x64.hash128)(pathToContext(thoughts)
  .map(thought => thought ? escapeSelector(thought) : '')
  .join(SEPARATOR_TOKEN)
  + (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : '')) as ContextHash
