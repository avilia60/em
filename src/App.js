/* eslint-disable jsx-a11y/accessible-emoji */
import * as pkg from '../package.json'
import './App.css'
import React from 'react'
import { Provider, connect } from 'react-redux'
import { createStore } from 'redux'
// import * as emojiStrip from 'emoji-strip'
import logo from './logo-180x180.png'
import ContentEditable from 'react-contenteditable'

/**************************************************************
 * Constants
 **************************************************************/

// maximum number of grandchildren that are allowed to expand
// const EXPAND_MAX = 12

// maximum number of characters of children to allow expansion
const NESTING_CHAR_MAX = 250

// ms on startup before offline mode is enabled
const OFFLINE_TIMEOUT = 3000

const RENDER_DELAY = 50

const MAX_DISTANCE_FROM_CURSOR = 3

const firebaseConfig = {
  apiKey: "AIzaSyB7sj38woH-oJ7hcSwpq0lB7hUteyZMxNo",
  authDomain: "em-proto.firebaseapp.com",
  databaseURL: "https://em-proto.firebaseio.com",
  projectId: "em-proto",
  storageBucket: "em-proto.appspot.com",
  messagingSenderId: "91947960488"
}

/**************************************************************
 * Helpers
 **************************************************************/

let globalCounter = 0
const globalCount = () => <span className='debug'> {globalCounter = (globalCounter + 1) % 1000}</span>

// parses the items from the url
const decodeItemsUrl = () => {
  const urlComponents = window.location.pathname.slice(1)
  return urlComponents
    ? urlComponents.split('/').map(component => window.decodeURIComponent(component))
    : ['root']
}

const encodeItemsUrl = (items, from) =>
  '/' + (isRoot(items)
    ? ''
    : items.map(item =>
      window.encodeURIComponent(item)).join('/')) +
      (from && from.length > 0
        ? '?from=' + window.encodeURIComponent(from.join('/'))
        : ''
    )

const getFromFromUrl = () => {
  return window.location.search
    ? window.decodeURIComponent(window.location.search.slice(1).split('=')[1])
      .split('/')
      .map(item => window.decodeURIComponent(item))
    : null
}

const timestamp = () => (new Date()).toISOString()

/** Equality for lists of lists. */
const deepEqual = (a, b) =>
  a === b ||
  (a && b &&
  a.length === b.length &&
  a.every && b.every &&
  a.every(itemA => b.includes(itemA)) &&
  b.every(itemB => a.includes(itemB)))

/** Returns the index of the first element in list that starts with items. */
const deepIndexStartsWith = (items, list) => {
  for(let i=0; i<list.length; i++) {
    if (deepEqual(items, list[i].slice(0, items.length))) return i
  }
  return -1
}

// gets a unique list of parents
// const uniqueParents = memberOf => {
//   const output = []
//   const dict = {}
//   for (let i=0; i<memberOf.length; i++) {
//     let key = memberOf[i].context.join('___SEP___')
//     if (!dict[key]) {
//       dict[key] = true
//       output.push(memberOf[i])
//     }
//   }
//   return output
// }

const flatMap = (list, f) => Array.prototype.concat.apply([], list.map(f))

/** Sums the length of all items in the list of items. */
const sumChildrenLength = children => children.reduce((accum, child) => accum + child.key.length, 0)

// sorts the given item to the front of the list
const sortToFront = (items, list) => {
  const i = deepIndexStartsWith(items, list)
  if (i === -1) throw new Error(`[${items}] not found in [${list.map(items => '[' + items + ']')}]`)
  return [].concat(
    [list[i]],
    list.slice(0, i),
    list.slice(i + 1)
  )
}

const compareByRank = (a, b) =>
  a.rank > b.rank ? 1 :
  a.rank < b.rank ? -1 :
  0

// sorts items emoji and whitespace insensitive
// const sorter = (a, b) =>
//   emojiStrip(a.toString()).trim().toLowerCase() >
//   emojiStrip(b.toString()).trim().toLowerCase() ? 1 : -1

// gets the signifying label of the given context.
const signifier = items => items[items.length - 1]

// returns true if the signifier of the given context exists in the data
const exists = items => !!store.getState().data[signifier(items)]

// gets the intersections of the given context; i.e. the context without the signifier
const intersections = items => items.slice(0, items.length - 1)

const hasIntersections = items => items.length > 1

const getParents = (items) => {
  const key = signifier(items)
  if (!exists(items)) {
    console.error(`Unknown key: "${key}", from context: ${items.join(',')}`)
    return []
  }
  return (store.getState().data[key].memberOf || [])
    .map(member => member.context || member) // TEMP: || member for backwards compatibility
}

/** Returns a subset of items from the start to the given item (inclusive) */
const ancestors = (items, item) => items.slice(0, items.indexOf(item) + 1)

/** Returns a subset of items without all ancestors up to the given time (exclusive) */
// const disown = (items, item) => items.slice(items.indexOf(item))

/** Returns a subset of items without all ancestors up to the given time (exclusive) */
const unroot = (items, item) => isRoot(items.slice(0, 1))
  ? items.slice(1)
  : items

/** Returns true if the items given is the root item. */
const isRoot = items => items.length === 1 && items[0] === 'root'

// generates children with their ranking
// TODO: cache for performance, especially of the app stays read-only
const getChildrenWithRank = (items, data) => {
  data = data || store.getState().data
  return flatMap(Object.keys(data), key =>
    ((data[key] || []).memberOf || [])
      // .sort(compareByRank)
      // .map(member => { return member.context || member }) // TEMP: || member for backwards compatibility
      .map(member => {
        if (!member) {
          throw new Error(`Key "${key}" has  null parent`)
        }
        return {
          key,
          rank: member.rank || 0,
          isMatch: deepEqual(items, member.context || member)
        }
      })
    )
    // filter out non-matches
    .filter(match => match.isMatch)
    // sort by rank
    .sort(compareByRank)
}

// generates children values only
// TODO: cache for performance, especially of the app stays read-only
const getChildren = items => {
  return getChildrenWithRank(items)
    .map(child => child.key)
}

// gets a new rank before the given item in a list but after the previous item
const getRankBefore = (value, context) => {
  const children = getChildrenWithRank(context)
  const i = children.findIndex(child => child.key === value)

  const prevChild = children[i - 1]
  const nextChild = children[i]

  const rank = prevChild
    ? (prevChild.rank + nextChild.rank) / 2
    : nextChild.rank - 1

  return rank
}


// gets a new rank after the given item in a list but before the following item
const getRankAfter = (value, context) => {
  const children = getChildrenWithRank(context)
  const i = children.findIndex(child => child.key === value)

  const prevChild = children[i]
  const nextChild = children[i + 1]

  const rank = nextChild
    ? (prevChild.rank + nextChild.rank) / 2
    : prevChild.rank + 1

  return rank
}

// gets an items's previous sibling with its rank
const prevSibling = (value, context) => {
  const siblings = getChildrenWithRank(context)
  let prev
  siblings.find(child => {
    if (child.key === value) {
      return true
    }
    else {
      prev = child
      return false
    }
  })
  return prev
}

// gets a rank that comes before all items in a context
const getPrevRank = (items, data) => {
  const children = getChildrenWithRank(items, data)
  return children.length > 0
    ? children[0].rank - 1
    : 0
}

// gets the next rank at the end of a list
const getNextRank = (items, data) => {
  const children = getChildrenWithRank(items, data)
  return children.length > 0
    ? children[children.length - 1].rank + 1
    : 0
}

// gets the rank of the item
const getRankOf = (item, context) => {
  return item.memberOf.find(parent => deepEqual(parent.context, context)).rank || 0
}

const hasChildren = items => {
  const data = store.getState().data
  return Object.keys(data).some(key =>
    ((data[key] || []).memberOf || [])
      .map(member => member.context || member) // TEMP: || member for backwards compatibility
      .some(parent => deepEqual(items, parent))
  )
}

// derived children are all grandchildren of the parents of the given context
const getDerivedChildren = items =>
  getParents(items)
    .filter(parent => !isRoot(parent))
    .map(parent => parent.concat(signifier(items)))

const emptySubheadings = (focus, subheadings) =>
  hasIntersections(focus) &&
  subheadings.length === 1 &&
  !hasChildren(subheadings[0])

/** Returns true if the item exists in the given context. */
// const hasContext = (item, context) =>
//   item && item.memberOf.some(parent => deepEqual(parent.context, context))

/** Removes the item from a given context. */
const removeContext = (item, context) => {
  if (typeof item === 'string') throw new Error('removeContext expects an [object] item, not a [string] value.')
  return {
      value: item.value,
      memberOf: item.memberOf.filter(parent =>
        !deepEqual(parent.context, context)
      ),
      lastUpdated: timestamp()
    }
}

// encode the items (and optionally rank) as a string for use in a className
const encodeItems = (items, rank) => items.join('__SEP__') + (rank ? '__SEP__' + rank : '')

/** Returns the editable DOM node of the given items */
const editableNode = (items, rank) => {
  return document.getElementsByClassName('editable-' + encodeItems(items, rank))[0]
}

// allow editable onFocus to be disabled temporarily
// this allows the selection to be re-applied after the onFocus event changes without entering an infinite focus loop
// this would not be a problem if the node was not re-rendered on state change
let disableOnFocus = false

// restores the selection to a given editable item
// and then dispatches setCursor
const restoreSelection = (items, rank, offset, dispatch) => {
  // only re-apply the selection the first time
  if (!disableOnFocus) {

    disableOnFocus = true
    let focusOffset = offset

    // 1. get the current focus offset unless it's being provided explicitly
    if (offset === undefined) {
      setTimeout(() => {
        focusOffset = window.getSelection().focusOffset
      }, 0)
    }

    // 2. dispatch the event to expand/contract nodes
    setTimeout(() => {
      dispatch({ type: 'setCursor', items })
    }, 0)

    // 3. re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        disableOnFocus = false
      }, 0)

      // re-apply the selection
      const el = editableNode(items, rank)
      if (!el) {
        console.error(`Could not find element: "editable-${encodeItems(items, rank)}"`)
        return
        // throw new Error(`Could not find element: "editable-${encodeItems(items)}"`)
      }
      if (el.childNodes.length === 0) {
        el.appendChild(document.createTextNode(''))
      }
      const textNode = el.childNodes[0]
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(textNode, Math.min(focusOffset, textNode.textContent.length))
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }, 0)
  }
}

/**************************************************************
 * Store & Reducer
 **************************************************************/

const initialState = {
  status: 'connecting',
  focus: decodeItemsUrl(),
  from: getFromFromUrl(),
  editingNewItem: null,
  editingContent: '',
  data: {
    root: {}
  },

  // cheap trick to re-render when data has been updated
  dataNonce: 0
}

// load data from localStorage
for(let key in localStorage) {
  if (key.startsWith('data-')) {
    const value = key.substring(5)
    initialState.data[value] = JSON.parse(localStorage[key])
  }
}

const appReducer = (state = initialState, action) => {
  // console.info('ACTION', action)
  return Object.assign({}, state, (({

    status: () => ({
      status: action.value
    }),

    authenticated: () => ({
      status: 'authenticated',
      user: action.user,
      userRef: action.userRef
    }),

    data: () => ({
      data: Object.assign({}, state.data, {
        [action.item.value]: action.item,
      }),
      lastUpdated: timestamp(),
      dataNonce: state.dataNonce + (action.bumpNonce ? 1 : 0)
    }),

    delete: () => {
      delete state.data[action.value]
      return {
        data: Object.assign({}, state.data),
        lastUpdated: timestamp(),
        dataNonce: state.dataNonce + (action.bumpNonce ? 1 : 0)
      }
    },

    navigate: () => {
      if (deepEqual(state.focus, action.to) && deepEqual([].concat(getFromFromUrl()), [].concat(action.from))) return state
      if (action.history !== false) {
        window.history[action.replace ? 'replaceState' : 'pushState'](
          state.focus,
          '',
          encodeItemsUrl(action.to, action.from)
        )
      }
      return {
        cursor: [],
        focus: action.to,
        from: action.from,
        editingNewItem: null,
        editingContent: ''
      }
    },

    newItemSubmit: () => {

      // create item if non-existent
      const item = action.value in state.data
        ? state.data[action.value]
        : {
          id: action.value,
          value: action.value,
          memberOf: []
        }

      // add to context
      item.memberOf.push({
        context: action.context,
        rank: action.rank
      })

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {
        sync(action.value, {
          value: item.value,
          memberOf: item.memberOf,
          lastUpdated: timestamp()
        }, null, true)

        if (action.ref) {
          action.ref.textContent = ''
        }

        store.dispatch({ type: 'newItemChange', value: '' })
      }, RENDER_DELAY)

      return {
        editingContent: '',
        dataNonce: state.dataNonce + 1
      }
    },

    newItemEdit: () => {

      // wait for re-render
      setTimeout(() => {
        action.ref.focus()
      }, RENDER_DELAY)

      return {
        editingNewItem: action.context
      }
    },

    newItemCancel: () => {

      action.ref.textContent = ''

      return {
        editingNewItem: null,
        editingContent: ''
      }
    },

    newItemChange: () => ({
      editingContent: action.value
    }),

    setCursor: () => ({
      cursor: action.items
    }),

    // context, oldValue, newValue
    existingItemChange: () => {

      // items may exist for both the old value and the new value
      const itemOld = state.data[action.oldValue]
      const itemCollision = state.data[action.newValue]
      const items = unroot(action.context).concat(action.oldValue)
      const itemsNew = unroot(action.context).concat(action.newValue)

      const itemNew = {
        value: action.newValue,
        memberOf: (itemCollision ? itemCollision.memberOf || [] : []).concat({
          context: action.context,
          rank: getRankOf(itemOld, action.context) // TODO: Add getNextRank(itemCillision.memberOf) ?
        }),
        lastUpdated: timestamp()
      }

      // get around requirement that reducers cannot dispatch actions
      setTimeout(() => {

        // remove from old context
        const newOldItem = removeContext(itemOld, action.context)
        if (newOldItem.memberOf.length > 0) {
          sync(action.oldValue, newOldItem)
        }
        // or remove entirely if it was the only context
        else {
          del(action.oldValue)
          delete state.data[action.oldValue]
        }

        // update item immediately for next calculations
        state.data[action.newValue] = itemNew
        sync(action.newValue, itemNew, null, false)

        // recursive function to change item within the context of all descendants
        // the inheritance is the list of additional ancestors built up in recursive calls that must be concatenated to itemsNew to get the proper context
        const changeDescendants = (items, inheritance=[]) => {

          getChildren(items).forEach(childValue => {
            const childItem = state.data[childValue]
            const rank = getRankOf(childItem, items)

            // remove and add the new of the childValue
            const childNew = removeContext(childItem, items)
            childNew.memberOf.push({
              context: itemsNew.concat(inheritance),
              rank
            })

            sync(childValue, childNew)

            // RECUR
            changeDescendants(items.concat(childValue), inheritance.concat(childValue))
          })
        }

        setTimeout(() => {
          changeDescendants(items)
        })

      })

      return {
        data: state.data
      }
    },

    existingItemDelete: () => {

      const items = unroot(action.context).concat(action.value)

      // remove the item from the context
      // (use setTimeout get around requirement that reducers cannot dispatch actions)
      setTimeout(() => {
        del(action.value, null, true)
      })

      // remove item from memberOf of each child
      setTimeout(() => {
        const children = getChildren(items)
        children.forEach(childValue => {
          const childItem = state.data[childValue]

          // remove deleted parent
          const childNew = removeContext(childItem, items)

          // modify the parents[i] of the childValue
          if (childNew.memberOf.length > 0) {
            sync(childValue, childNew)
          }
          // or if this was the last parent, delete the child
          else {
            // dispatch an event rather than call del directly in order to delete recursively for all orphan'd descendants
            store.dispatch({ type: 'existingItemDelete', value: childValue, context: items })
            // del(childValue, null, true)
          }
        })
      })

      return {
        dataNonce: state.dataNonce + 1
      }
    }

  })[action.type] || (() => state))())
}

const store = createStore(appReducer)

/**************************************************************
 * LocalStorage && Firebase Setup
 **************************************************************/

// Set to offline mode in 5 seconds. Cancelled with successful login.
const offlineTimer = window.setTimeout(() => {
  store.dispatch({ type: 'status', value: 'offline' })
}, OFFLINE_TIMEOUT)

// firebase init
const firebase = window.firebase
if (firebase) {
  firebase.initializeApp(firebaseConfig)

  // delay presence detection to avoid initial disconnected state
  // setTimeout(() => {
  // }, 1000)
  const connectedRef = firebase.database().ref(".info/connected")
  connectedRef.on('value', snap => {
    const connected = snap.val()

    // update offline state
    // do not set to offline if in initial connecting state; wait for timeout
    if (connected || store.getState().status !== 'connecting') {
      store.dispatch({ type: 'status', value: connected ? 'connected' : 'offline' })
    }
  })

  // check if user is logged in
  firebase.auth().onAuthStateChanged(user => {

    // if not logged in, redirect to OAuth login
    if (!user) {
      store.dispatch({ type: 'offline', value: true })
      const provider = new firebase.auth.GoogleAuthProvider();
      firebase.auth().signInWithRedirect(provider)
      return
    }

    // disable offline mode
    window.clearTimeout(offlineTimer)

    // if logged in, save the user ref and uid into state
    const userRef = firebase.database().ref('users/' + user.uid)

    store.dispatch({
      type: 'authenticated',
      userRef,
      user
    })

    // update user information
    userRef.update({
      name: user.displayName,
      email: user.email
    })

    // load Firebase data
    userRef.on('value', snapshot => {
      const value = snapshot.val()

      // init root if it does not exist (i.e. local = false)
      if (!value.data || !value.data['data-root']) {
        sync('root')
      }
      // otherwise sync all data locally
      else {
        syncAll(value.data)
      }
    })

  })
}

// delete from state, localStorage, and Firebase
const del = (key, localOnly, bumpNonce) => {

  const lastUpdated = timestamp()

  // state
  store.dispatch({ type: 'delete', value: key, bumpNonce })

  // localStorage
  localStorage.removeItem('data-' + key)
  localStorage.lastUpdated = lastUpdated

  // firebase
  if (!localOnly && firebase) {
    store.getState().userRef.child('data/data-' + key).remove()
  }

}

// save to state, localStorage, and Firebase
const sync = (key, item={}, localOnly, bumpNonce, callback) => {

  const lastUpdated = timestamp()
  const timestampedItem = Object.assign({}, item, { lastUpdated })

  // state
  store.dispatch({ type: 'data', item: timestampedItem, bumpNonce })

  // localStorage
  localStorage['data-' + key] = JSON.stringify(timestampedItem)
  localStorage.lastUpdated = lastUpdated

  // firebase
  if (!localOnly && firebase) {
    store.getState().userRef.update({
      ['data/data-' + key]: timestampedItem,
      lastUpdated
    }, callback)
  }

}

// save all data to state and localStorage
const syncAll = data => {
  for (let key in data) {
    const item = data[key]
    const oldItem = store.getState().data[key.slice(5)]

    if (!oldItem || item.lastUpdated > oldItem.lastUpdated) {
      store.dispatch({ type: 'data', item })
      localStorage[key] = JSON.stringify(item)
    }
  }
}

/**************************************************************
 * Window Events
 **************************************************************/

window.addEventListener('popstate', () => {
  store.dispatch({
    type: 'navigate',
    to: decodeItemsUrl(),
    from: getFromFromUrl(),
    history: false
  })
})

/**************************************************************
 * Components
 **************************************************************/

const AppComponent = connect((
    { dataNonce, cursor, focus, from, editingNewItem, editingContent, status, user }) => (
    { dataNonce, cursor, focus, from, editingNewItem, editingContent, status, user }))((
    { dataNonce, cursor, focus, from, editingNewItem, editingContent, status, user, dispatch }) => {

  const directChildren = getChildrenWithRank(focus)

  const subheadings = directChildren.length > 0
    ? [focus]
    : sortToFront(from || focus, getDerivedChildren(focus))//.sort(sorter)

  // if there are derived children but they are all empty, then bail and redirect to the global context
  if (emptySubheadings(focus, subheadings)) {
    setTimeout(() => {
      dispatch({ type: 'navigate', to: [signifier(focus)], replace: true })
    }, 0)
    return null
  }

  const otherContexts = getParents(focus)

  return <div className='container dark'>
    <div className={'content' + (from ? ' from' : '')}>
      <HomeLink />
      <Status status={status} />

      { /* Subheadings */ }
      <div>
        { /* TODO: Why is this separate? */ }
        {subheadings.length === 0 ? <div>

          { /* Subheading */ }
          {!isRoot(focus) ? <Subheading items={focus} /> : null}

          { /* New Item */ }
          <NewItem context={focus} editing={editingNewItem && deepEqual(editingNewItem, focus)} editingContent={editingContent} />
        </div> : null}

        {subheadings.map((items, i) => {
          const children = (directChildren.length > 0
            ? directChildren
            : getChildrenWithRank(items)
          )//.sort(sorter)

          // get a flat list of all grandchildren to determine if there is enough space to expand
          // const grandchildren = flatMap(children, child => getChildren(items.concat(child)))

          return i === 0 || /*otherContexts.length > 0 || directChildren.length > 0 ||*/ from ? <div key={i}>
            { /* Subheading */ }
            {!isRoot(focus) ? <Subheading items={items} /> : null}

            {/* Subheading Children
                Note: Override directChildren by passing children
            */}
            <Children focus={focus} cursor={cursor} items={items} children={children} expandable={true} />

            { /* New Item */ }
            <ul style={{ marginTop: 0 }} className={!editingNewItem ? 'list-none' : null}>
              <li className='leaf'><NewItem context={items} editing={editingNewItem && deepEqual(editingNewItem, items)} editingContent={editingContent} /></li>
            </ul>

            { /* Other Contexts */ }
            {i === 0 && otherContexts.length > 1 /*&& (directChildren.length > 0 || from)*/ ? <div className='other-contexts'>
                <Link items={directChildren.length > 0 || !from ? [signifier(focus)] : from.concat(focus)}
                  label={<span>{otherContexts.length - 1} other context{otherContexts.length > 2 ? 's' : ''} <span className={directChildren.length > 0 ? 'down-chevron' : 'up-chevron'}>{directChildren.length > 0 ? '⌄' : '⌃'}</span></span>}
                  from={focus.length > 1 ? intersections(focus) : null}
              />
              </div> : null}
          </div> : null
        })}
      </div>
    </div>

    <ul className='footer list-none'>
      <li><a className='settings-logout' onClick={() => firebase && firebase.auth().signOut()}>Log Out</a></li><br/>
      <li><span className='dim'>Version: </span>{pkg.version}</li>
      {user ? <li><span className='dim'>Logged in as: </span>{user.email}</li> : null}
      {user ? <li><span className='dim'>User ID: </span><span className='mono'>{user.uid}</span></li> : null}
    </ul>

  </div>
})

const Status = ({ status }) => <div className='status'>
  {status === 'connecting' ? <span>Connecting...</span> : null}
  {status === 'offline' ? <span className='error'>Offline</span> : null}
</div>

const HomeLink = connect()(({ dispatch }) =>
  <a className='home' onClick={() => dispatch({ type: 'navigate', to: ['root'] })}><span role='img' arial-label='home'><img className='logo' src={logo} alt='em' width='24' /></span></a>
)

const Subheading = ({ items, cursor=[] }) => {
  // extend items with the items that are hidden from autofocus
  const hiddenItems = cursor.slice(items.length, cursor.length - MAX_DISTANCE_FROM_CURSOR + 1)
  const extendedItems = items.concat(hiddenItems)
  return <h2>
    {extendedItems.map((item, i) => {
      const subitems = ancestors(extendedItems, item)
      return <span key={i} className={item === signifier(extendedItems) ? 'subheading-focus' : null}>
        {i > 0 ? <span> + </span> : null}
        <Link items={subitems} />
        <Superscript items={subitems} />
      </span>
    })}
  </h2>
}

/** A recursive child element that consists of a <li> containing an <h3> and <ul> */
const Child = ({ focus, cursor=[], items, rank, depth=0, count=0 }) => {

  const children = getChildrenWithRank(items)

  return <li className={
    'child' +
    (children.length === 0 ? ' leaf' : '')
  }>
    <h3 className={depth === 0 ? 'child-heading' : 'grandchild-heading'}>
      <Editable focus={focus} items={items} rank={rank} />
      <Superscript items={items} />
      <span className='depth-bar' style={{ width: children.length * 2 }} />
    </h3>{globalCount()}

    { /* Recursive Children */ }
    <Children focus={focus} cursor={cursor} items={items} children={children} count={count} depth={depth} />
  </li>
}

// NOTE: focus is only needed for <Editable> to determine where to restore the selection after delete
const Children = connect((state, props) => {
  return {
    // track the transcendental identifier if editing to trigger expand/collapse
    isEditing: (state.cursor || []).includes(signifier(props.items)),
  }
})(({ isEditing, focus, cursor=[], items, children, expandable, count=0, depth=0 }) => {

  const show = (isRoot(items) || isEditing || expandable) &&
    children.length > 0 &&
    count + sumChildrenLength(children) <= NESTING_CHAR_MAX

  // embed data-items-length so that distance-from-cursor can be set on each ul when there is a new cursor location (autofocus)
  // unroot items so ['root'] is not counted as 1
  return show ? <div>
    <ul
      data-items-length={unroot(items).length}
      className='children'
    >
      {children.map((child, i) => {
        const childItems = unroot(items).concat(child.key)
        return <Child key={i} focus={focus} cursor={cursor} items={childItems} rank={child.rank} count={count + sumChildrenLength(children)} depth={depth + 1} />
      })}
    </ul>
    {globalCount()}
  </div> : null
})

// renders a link with the appropriate label to the given context
const Link = connect()(({ items, label, from, dispatch }) => {
  const value = label || signifier(items)
  return <a href={encodeItemsUrl(items, from)} className='link' onClick={e => {
    e.preventDefault()
    document.getSelection().removeAllRanges()
    dispatch({ type: 'navigate', to: e.shiftKey ? [signifier(items)] : items, from: e.shiftKey ? decodeItemsUrl() : from })
  }}>{value}</a>
})

const Editable = connect()(({ focus, items, rank, from, cursor, dispatch }) => {
  const value = signifier(items)
  const ref = React.createRef()
  const context = items.length > 1 ? intersections(items) : ['root']
  let valueLive = value
  let itemsLive = items
  const baseDepth = decodeItemsUrl().length

  // add identifiable className for restoreSelection
  return <ContentEditable className={'editable editable-' + encodeItems(items, rank)} html={value} ref={ref}
    onKeyDown={e => {
      // ref is always null here

      valueLive = e.target.textContent
      itemsLive = intersections(items).concat(valueLive)

      // use e.target.textContent
      if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.textContent === '') {
        e.preventDefault()
        const prev = prevSibling('', context)
        dispatch({ type: 'existingItemDelete', value: '', context })

        // normal delete: restore selection to prev item
        if (prev) {
          restoreSelection(
            intersections(items).concat(prev.key),
            prev.rank,
            prev.key.length,
            dispatch
          )
        }
        // delete from head of focus: restore selection to next item
        else if (signifier(context) === signifier(focus)) {
          const next = getChildrenWithRank(context)[1]
          if (next) {
            restoreSelection(intersections(items).concat(next.key), next.rank, 0, dispatch)
          }
        }
        // delete from first child: restore selection to context
        else {
          const contextItem = store.getState().data[signifier(context)]
          const contextContext = intersections(context).length > 0 ? intersections(context) : ['root']
          restoreSelection(
            context,
            getRankOf(contextItem, contextContext),
            signifier(context).length,
            dispatch
          )
        }
      }
      else if (e.key === 'Enter') {
        e.preventDefault()

        // if shift key is pressed, add a child instead of a sibling
        const insertNewChild = e.metaKey
        const insertBefore = e.shiftKey
        const newRank = insertNewChild
          ? (insertBefore ? getPrevRank : getNextRank)(itemsLive)
          : (insertBefore ? getRankBefore : getRankAfter)(e.target.textContent, context)

        dispatch({
          type: 'newItemSubmit',
          context: insertNewChild ? itemsLive : context,
          rank: newRank,
          value: '',
          ref: ref.current
        })

        disableOnFocus = true
        setTimeout(() => {
          // track the transcendental identifier if editing
          disableOnFocus = false
          restoreSelection((insertNewChild ? itemsLive : intersections(itemsLive)).concat(''), newRank, 0, dispatch)
        }, RENDER_DELAY)
      }
    }}
    onFocus={e => {

      // if the focused node is destroyed in the re-render, the selection needs to be restored
      // delay until after the render
      if (!disableOnFocus) {

        disableOnFocus = true
        setTimeout(() => {
          disableOnFocus = false
          // if the DOM node for the original items exists (e.g. sibling) restore it as-is
          // otherwise, assume that an ancestor was modified and recreate the new items
          restoreSelection(editableNode(items, rank)
            ? items
            : itemsLive.concat(items.slice(itemsLive.length))
          , rank, 0, dispatch)
        }, 0)

        dispatch({ type: 'setCursor', items })

        // autofocus
        // update distance-from-cursor on each ul
        setTimeout(() => {
          const uls = document.getElementsByClassName('children')
          for (let i=0; i<uls.length; i++) {
            const ul = uls[i]
            const depth = +ul.getAttribute('data-items-length')
            const distance = Math.max(0,
              Math.min(MAX_DISTANCE_FROM_CURSOR,
                items.length - depth - baseDepth// + offset
              )
            )

            ul.classList.remove('distance-from-cursor-0', 'distance-from-cursor-1', 'distance-from-cursor-2', 'distance-from-cursor-3')
            ul.classList.add('distance-from-cursor-' + distance)
          }
        })
      }

    }}
    onChange={e => {
      // NOTE: Do not use ref.current here as it not accurate after newItemSubmit
      // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      if (e.target.value !== valueLive) {
        const item = store.getState().data[valueLive]
        if (item) {
          dispatch({ type: 'existingItemChange', context, oldValue: valueLive, newValue: e.target.value })

          // keep track of the new items so the selection can be restored (see onFocus)
          valueLive = e.target.value
          itemsLive = intersections(items).concat(valueLive)
        }
      }
    }}
  />
})

// renders superscript if there are other contexts
const Superscript = connect((state, props) => {
  return {
    // track the transcendental identifier if editing
    editing: deepEqual(state.cursor, props.items)
  }
})(({ items, editing, showSingle, dispatch }) => {
  if (!items || items.length === 0 || !exists(items)) return null
  const contexts = getParents(items)
  return contexts.length > (showSingle ? 0 : 1)
    ? <sup className='num-contexts'>{contexts.length}{editing
      ? <a onClick={() => {
        dispatch({ type: 'navigate', to: [signifier(items)], from: intersections(items) })
      }}> ↗</a>/*⬀⬈↗︎⬏*/
      : null}{globalCount()}</sup>
    : null
})

const NewItem = connect()(({ context, editing, editingContent, dispatch }) => {
  const ref = React.createRef()
  return <div>
    <h3 className='child-heading' style={{ display: !editing ? 'none' : null}}>
      <span contentEditable ref={ref} className='add-new-item'
        onKeyDown={e => {
          if (e.key === 'Enter') {
            dispatch({ type: 'newItemSubmit', context, rank: getNextRank(context), value: e.target.textContent, ref: ref.current })
          }
          else if (e.key === 'Escape') {
            dispatch({ type: 'newItemCancel', ref: ref.current })
          }
        }}
        onBlur={e => {
          dispatch({ type: 'newItemCancel', ref: ref.current })
        }}
      />
      {<Superscript items={[editingContent]} showSingle={true} />}
    </h3>
    {!editing ? <span className='add-icon' onClick={() => dispatch({ type: 'newItemEdit', context, ref: ref.current })}>+</span> : null}
  </div>
})

const App = () => <Provider store={store}>
  <AppComponent/>
</Provider>

export default App
