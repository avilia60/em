export default (state, { value, draggedThoughtsRanked }) => {
  return {
    dragHold: value,
    draggedThoughtsRanked,
  }
}
