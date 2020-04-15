export default (state, { value, draggedThoughtsRanked }) => ({
  dragInProgress: value,
  draggedThoughtsRanked: state.draggedThoughtsRanked ? (!draggedThoughtsRanked ? draggedThoughtsRanked : state.draggedThoughtsRanked) : draggedThoughtsRanked
})
