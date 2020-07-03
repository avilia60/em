import RedoIcon from '../components/redoIcon'

const redoShortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  canExecute: () => false,
  exec: () => { }
}

export default redoShortcut
