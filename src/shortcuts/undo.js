import UndoIcon from '../components/undoIcon'

const undoShortcut = {
  id: 'undo',
  name: 'Undo',
  description: 'Undo.',
  svg: UndoIcon,
  canExecute: () => false,
  exec: (dispatch, getState) => { }
}

export default undoShortcut
