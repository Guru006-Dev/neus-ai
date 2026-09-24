import { describe, expect, it } from 'vitest'
import { AGENT_IDS, PHASES } from './timeline'
import { AGENTS, DOC, KNOWLEDGE_GRAPH, STORY_STEPS, agentStory, captionAt, labelAt, metricText } from './nexus-story'

describe('nexus-story', () => {
  it('agents follow the timeline order', () => {
    expect(AGENTS.map((a) => a.id)).toEqual([...AGENT_IDS])
  })

  it('metricText is empty before work and final at completion', () => {
    const explorer = agentStory('explorer')
    const demo = agentStory('demo')
    expect(metricText(explorer, 0)).toBe('')
    expect(metricText(explorer, 1)).toBe('14 sources')
    expect(metricText(demo, 0.5)).toBe('rendering')
    expect(metricText(demo, 1)).toBe('preview ready')
    expect(metricText(agentStory('qa'), 1)).toBe('24/24 passed')
  })

  it('captions and labels cover every phase', () => {
    expect(captionAt('agents', 'qa')).toBe(agentStory('qa').caption)
    expect(labelAt('agents', 'qa')).toBe('QA')
    for (const ph of PHASES) {
      if (ph.id === 'agents' || ph.id === 'still') continue
      expect(captionAt(ph.id, null)).not.toBe('')
    }
    expect(captionAt('still', null)).toBe('')
  })

  it('screen content is internally consistent', () => {
    expect(DOC.sections).toHaveLength(6)
    expect(STORY_STEPS).toHaveLength(8)
    for (const [a, b] of KNOWLEDGE_GRAPH.edges) {
      expect(a).toBeLessThan(KNOWLEDGE_GRAPH.nodes.length)
      expect(b).toBeLessThan(KNOWLEDGE_GRAPH.nodes.length)
    }
  })
})
