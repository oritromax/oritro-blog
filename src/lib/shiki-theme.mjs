/**
 * Custom Shiki theme matching the design system's code tokens (tokens.css).
 * Code surfaces are dark in BOTH site themes, so one Shiki theme suffices.
 * Token colors per spec §8.
 */
/** @type {import('astro').ShikiConfig['theme']} */
export default {
  name: 'ioritro-code',
  type: /** @type {const} */ ('dark'),
  colors: {
    'editor.background': '#1B1E26',
    'editor.foreground': '#D8D6D0',
  },
  settings: [
    {
      settings: { background: '#1B1E26', foreground: '#D8D6D0' },
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#5F6673', fontStyle: 'italic' },
    },
    {
      scope: ['string', 'string.quoted', 'punctuation.definition.string'],
      settings: { foreground: '#9DD88F' },
    },
    {
      scope: ['constant.numeric', 'constant.language', 'constant.character', 'constant.other'],
      settings: { foreground: '#F0A94F' },
    },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.operator.new', 'keyword.control'],
      settings: { foreground: '#C27DE8' },
    },
    {
      scope: ['entity.name.function', 'support.function', 'meta.function-call.generic'],
      settings: { foreground: '#6E9CE8' },
    },
    {
      scope: [
        'entity.other.attribute-name',
        'support.type',
        'support.class',
        'entity.name.type',
        'entity.name.tag',
        'support.type.property-name',
      ],
      settings: { foreground: '#45CBD8' },
    },
    {
      scope: ['variable', 'variable.parameter', 'variable.other'],
      settings: { foreground: '#D8D6D0' },
    },
    {
      scope: ['keyword.operator', 'punctuation'],
      settings: { foreground: '#8B909C' },
    },
  ],
};
