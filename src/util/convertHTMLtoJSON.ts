import _ from 'lodash'
import { Element, HimalayaNode, Text, parse } from 'himalaya'
import { Block } from '../action-creators/importText'

interface PreBlock extends Block {
  wasSpan?: boolean,
}

/** Parses input HTML and saves in JSON array using Himalaya. */
export const convertHTMLtoJSON = (html: string) => {

  /** Check if string contains only characters from given 'includes' array. */
  const isStringIncludesOnly = (str: string, includes: string[]) => {
    const matched =
      includes
        .map(char => str.replace(new RegExp(`[^${char}]`, 'g'), '').length)
        .reduce((acc, cur) => acc + cur, 0)
    return matched === str.length
  }

  /** Retrieve attribute from Element node by key. */
  const getAttribute = (key: string, node: Element) => {
    const { attributes } = node
    const attribute = attributes.find(attr => attr.key === key)
    return attribute ? attribute.value : undefined
  }

  /** Removes empty nodes and comments from himalaya's JSON output. */
  const removeEmptyNodesAndComments = (nodes: HimalayaNode[]) => {
    return nodes.filter(node => {
      if (node.type === 'element') {
        if (node.tagName === 'br') return false
        node.children = removeEmptyNodesAndComments(node.children)
        return true
      }
      if (node.type === 'comment') return false
      if (node.type === 'text' && isStringIncludesOnly(node.content, ['\n', ' '])) return false
      return node.content.length
    }) as (Element | Text)[]
  }

  /** Append children to parent as children property if it's necessary. */
  const joinChildren = (nodes: (PreBlock[] | PreBlock)[]): PreBlock[] | PreBlock => {
    // in case of element with span tag around text (e.g. one <span>and</span> two)
    if (nodes.some(node => !Array.isArray(node) ? node.wasSpan : false)) {
      // take all text elements
      const splittedText = _.takeWhile(nodes, node => !Array.isArray(node))
      // join their content in a single line
      const fullScope = splittedText.map(node => node && !Array.isArray(node) ? node.scope : '').join('')
      const children = _.dropWhile(nodes, node => !Array.isArray(node))
      return {
        scope: fullScope,
        children,
      } as PreBlock
    }
    // WorkFlowy import with notes
    if (nodes.some(node => node && !Array.isArray(node) && node.scope === '=note')) {
      const parent = _.first(nodes)
      const children = _.tail(nodes)
      return Object.assign({}, parent, { children: children.flat() }) as PreBlock
    }
    if (nodes.every(node => Array.isArray(node))) return nodes.flat()
    if (nodes.some(node => Array.isArray(node))) {
      const chunks = _.chunk(nodes, 2)
      const parentsWithChildren = chunks.map(chunk => chunk.reduce((acc, node, index) => {
        if (index === 0) return node as PreBlock
        else return Object.assign({}, acc, { children: node }) as PreBlock
      }) as PreBlock)
      return parentsWithChildren.length === 1 ? parentsWithChildren[0] : parentsWithChildren
    }
    return nodes as PreBlock[]
  }

  /** Retrive content of Text element and return PreBlock. */
  const convertTextToPreBlock = (node: Text, wrappedTag?: string) => {
    return {
      scope: wrappedTag ? `<${wrappedTag}>${node.content.trim()}</${wrappedTag}>` : node.content.trim(),
      children: [],
    } as PreBlock
  }

  /** Conver to PreBlock based on foramtting tag. */
  const convertFormattingTags = (node: Element) => {
    if (node.tagName === 'i' || node.tagName === 'b') {
      const [child] = node.children as Text[]
      return convertTextToPreBlock(child, node.tagName)
    }
    else if (node.tagName === 'span') {
      const attribute = getAttribute('class', node)
      // WorkFlowy import with notes
      if (attribute === 'note') {
        const [note] = node.children
        return {
          scope: '=note',
          children: [{
            scope: note.type === 'text' ? note.content : '',
            children: [],
          }]
        }
      }
      const [child] = node.children as Text[]
      return Object.assign({}, convertTextToPreBlock(child), { wasSpan: true })
    }
  }

  /** Convert PreBlock array to Block array. */
  const convertToBlock = (nodes: PreBlock[]): Block[] => nodes.map(node => {
    if (node.children.length > 0) return Object.assign({}, node, { children: convertToBlock(node.children) }) as Block
    else return node as Block
  })

  /** Converts each Array of HimalayaNodes to PreBlock. */
  const convert = (nodes: (Element | Text)[]): PreBlock[] | PreBlock => {
    const blocks = nodes.map(node => {
      // convert Text directly to PreBlock
      if (node.type === 'text') {
        return convertTextToPreBlock(node)
      }
      // convert formatting tag
      if (node.tagName === 'i' || node.tagName === 'b' || node.tagName === 'span') {
        return convertFormattingTags(node)
      }
      // convert children of ul
      if (node.tagName === 'ul') {
        return convert(node.children as (Element | Text)[])
      }
      // convert li
      const { children } = node
      if (children.length === 1) {
        const [childNode] = children as (Element | Text)[]
        if (childNode.type === 'text') {
          return {
            scope: childNode.content,
            children: []
          } as PreBlock
        }
        else if (childNode.type === 'element' && childNode.tagName === 'ul') {
          return [{
            scope: '',
            children: convert(childNode.children as (Element | Text)[])
          } as PreBlock]
        }
      }
      else return convert(node.children as (Element | Text)[])
    }).filter(node => node !== undefined) as (PreBlock | PreBlock[])[]
    return blocks.length > 1 ? joinChildren(blocks) : blocks.flat()
  }

  /** Clear himalaya's output and converts to Block. */
  const convertHimalayaToBlock = (nodes: HimalayaNode[]) => {
    const preBlocks = convert(removeEmptyNodesAndComments(nodes))
    return Array.isArray(preBlocks) ? convertToBlock(preBlocks) : convertToBlock([preBlocks])
  }

  return convertHimalayaToBlock(parse(html))
}
