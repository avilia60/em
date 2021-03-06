import { Dispatch } from 'react'
import RedoIcon from '../components/RedoIcon'
import { Shortcut } from '../types'
import { State } from '../util/initialState'
import { isRedoEnabled } from '../util/isRedoEnabled'

interface RedoAction {
  type: 'redoAction',
}

const redoShortcut: Shortcut = {
  id: 'redo',
  name: 'Redo',
  description: 'Redo',
  svg: RedoIcon,
  exec: (dispatch: Dispatch<RedoAction>, getState: () => State) => {
    if (!isRedoEnabled(getState())) {
      return
    }
    dispatch({
      type: 'redoAction',
    })
  }
}

export default redoShortcut
