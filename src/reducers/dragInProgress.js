export default (state, { value, draggedThoughtsRanked }) => {
  console.log(state.draggedThoughtsRanked)
  return {
    dragInProgress: value,
    // Prevent setting new draggedThoughtRanked before, if previous value wasn't reset to undefined
    draggedThoughtsRanked: state.draggedThoughtsRanked ? (!draggedThoughtsRanked ? undefined : state.draggedThoughtsRanked) : draggedThoughtsRanked
  }
}
