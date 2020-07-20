import { initialState, reducerFlow } from '../../util'
import {
  cursorBack,
  cursorDown,
  cursorForward,
  cursorUp,
  newThought,
  setCursor,
  toggleContextView,
} from '../../reducers'

it('reverse cursorBack', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    cursorBack,
    cursorForward,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('move to first child if there is no history', () => {

  const steps = [
    newThought({ value: 'a' }),
    newThought({ value: 'b', insertNewSubthought: true }),
    newThought({ value: 'c' }),
    setCursor({ thoughtsRanked: [{ value: 'a', rank: 0 }] }),
    cursorForward,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }, { value: 'b', rank: 0 }])

})

it('move to first child if there is no cursor', () => {

  const steps = [
    newThought({ value: 'a' }),
    setCursor({ thoughtsRanked: null }),
    cursorForward,
  ]

  const stateNew = reducerFlow(steps)(initialState())

  expect(stateNew.cursor)
    .toMatchObject([{ value: 'a', rank: 0 }])

})

describe('context view', () => {

  // create a minimal structure for context view
  const startSteps = [
    newThought({ value: 'a' }),
    newThought({ value: 'm', insertNewSubthought: true }),
    newThought({ value: 'x', insertNewSubthought: true }),
    cursorUp,
    cursorUp,
    newThought({ value: 'b' }),
    newThought({ value: 'm', insertNewSubthought: true }),
  ]

  it('reverse cursorBack', () => {

    const steps = [
      ...startSteps,
      toggleContextView,
      cursorDown,
      cursorBack,
      cursorForward,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }, { value: 'm', rank: 0 }, { value: 'a', rank: 0 }])

  })

  it('move to first context if there is no history', () => {

    const steps = [
      ...startSteps,
      toggleContextView,
      cursorForward,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }, { value: 'm', rank: 0 }, { value: 'a', rank: 0 }])

  })

  it('move to first child of context if there is no history', () => {

    const steps = [
      ...startSteps,
      toggleContextView,
      cursorForward,
      cursorForward,
    ]

    const stateNew = reducerFlow(steps)(initialState())

    expect(stateNew.cursor)
      .toMatchObject([{ value: 'b', rank: 1 }, { value: 'm', rank: 0 }, { value: 'a', rank: 0 }, { value: 'x', rank: 0 }])

  })

})
