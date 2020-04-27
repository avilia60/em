import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'

import {
  equalThoughtsRanked,
} from '../util'

const mapStateToProps = ({ dragHold, dragInProgress, draggedThoughtsRanked }, props) => ({
  dragging: (dragHold || dragInProgress) && equalThoughtsRanked(draggedThoughtsRanked, props.thoughtsRanked),
})

/** A large gray bullet that surrounds the normal bullet when the cursor is on the thought. Highlighted when dragging. */
const BulletOverlay = ({ dragging }) =>
  <span className={classNames({
    'bullet-cursor-overlay': true,
    dragging,
  })}>•</span>

export default connect(mapStateToProps)(BulletOverlay)
