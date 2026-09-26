/**
 * The block bodies for the seeded blog articles.
 *
 * Every published article on ArchFacing reads the same way — an opening
 * paragraph, numbered sections, an icon row or a picture grid, and a closing
 * quote. Only the lead article had a body; the other eleven rendered as a
 * single line of excerpt, which made the blog look half-built and gave an
 * author no example to follow.
 *
 * Keyed by slug, in exactly the shape `saveBlogAction` writes and
 * `articleBody()` reads — so opening one of these in the dashboard's Blog
 * Builder and saving it again changes nothing.
 *
 * ⚠️ Demo content. The claims here are ordinary professional practice rather
 *    than researched fact; they exist so the page has something real-shaped to
 *    render.
 */

import { ARTICLE_PHOTOS } from '../src/config/content-media'

type Block = Record<string, unknown>

export const ARTICLE_BODIES: Record<string, Block[]> = {
  // ─────────────────────────────────────────────
  'rise-of-green-buildings': [
    {
      type: 'lead',
      text: 'A green building is not a more expensive building. It is a building whose **running cost** was decided at design stage rather than discovered after handover.',
    },
    { type: 'heading', number: 1, level: 2, text: 'What actually makes a building green' },
    {
      type: 'para',
      text: 'Certification tends to get the attention, but the decisions that matter are duller and earlier: which way the long face points, how deep the overhangs are, and how much of the envelope is glass.',
    },
    {
      type: 'iconGrid',
      columns: 3,
      items: [
        { icon: 'chart', title: 'Envelope first', body: 'Insulation and shading before any equipment.' },
        { icon: 'box', title: 'Right-sized services', body: 'A smaller load needs a smaller plant.' },
        { icon: 'shield', title: 'Durable materials', body: 'What lasts longest is usually greenest.' },
      ],
    },
    { type: 'heading', number: 2, level: 2, text: 'What the owner notices' },
    {
      type: 'cards',
      items: [
        { icon: 'rupee', title: 'Lower bills' },
        { icon: 'star', title: 'Steadier comfort' },
        { icon: 'shield', title: 'Fewer repairs' },
        { icon: 'check', title: 'Easier resale' },
      ],
    },
    {
      type: 'quote',
      text: 'The greenest building is the one that still works in thirty years without being stripped back to its frame.',
    },
  ],

  // ─────────────────────────────────────────────
  'top-10-interior-design-trends': [
    {
      type: 'lead',
      text: 'Most of what gets called a trend is a finish. The handful worth following are the ones that change how a room is *used*.',
    },
    { type: 'heading', number: 1, level: 2, text: 'The ones that last' },
    {
      type: 'bullets',
      items: [
        'Rooms that do two jobs, planned for both rather than one',
        'Natural materials left visible instead of wrapped',
        'Layered light — ambient, task and accent, on separate circuits',
        'Built-in storage sized to what is actually stored',
        'Colour on one surface rather than on everything',
      ],
    },
    { type: 'heading', number: 2, level: 2, text: 'Where they show up' },
    {
      type: 'imageGrid',
      columns: 3,
      items: [
        { image: ARTICLE_PHOTOS.interiorTrends, caption: 'Quiet palette, one accent' },
        { image: ARTICLE_PHOTOS.comfortLiving, caption: 'Layered lighting' },
        { image: ARTICLE_PHOTOS.loft, caption: 'Material left visible' },
      ],
    },
    {
      type: 'quote',
      text: 'A room dates the moment its finishes are the only thing holding it together.',
    },
  ],

  // ─────────────────────────────────────────────
  'modern-construction-technologies': [
    {
      type: 'lead',
      text: 'The technologies changing Indian construction are not the photogenic ones. They are the ones that remove a **coordination meeting**.',
    },
    { type: 'heading', number: 1, level: 2, text: 'Three that have arrived' },
    {
      type: 'numbered',
      items: [
        { title: 'BIM', body: 'Clashes found on screen instead of on site. The saving is in rework that never happens.' },
        { title: 'Precast', body: 'Predictable quality and a shorter programme, where the site can take the crane.' },
        { title: 'Drone survey', body: 'Progress measured weekly against the model rather than argued over monthly.' },
      ],
    },
    { type: 'heading', number: 2, level: 2, text: 'What each one needs from you' },
    {
      type: 'iconGrid',
      columns: 3,
      items: [
        { icon: 'users', title: 'A shared model', body: 'One file everyone draws on, not five.' },
        { icon: 'calendar', title: 'Earlier decisions', body: 'Precast ends the habit of deciding late.' },
        { icon: 'chart', title: 'Someone to read it', body: 'Data nobody reviews is only storage.' },
      ],
    },
    {
      type: 'quote',
      text: 'Technology on a site pays for itself the first time it stops two trades arriving on the same day.',
    },
  ],

  // ─────────────────────────────────────────────
  'innovative-building-materials': [
    {
      type: 'lead',
      text: 'A new material is worth specifying when it does an old job **better in a measurable way** — and worth ignoring when it only does it differently.',
    },
    { type: 'heading', number: 1, level: 2, text: 'What to look at on the datasheet' },
    {
      type: 'bullets',
      items: [
        'Declared life, and what happens at the end of it',
        'Thermal performance in the assembly, not in the sample',
        'Water behaviour — absorption, and what it does when wet',
        'Whether it can be repaired, or only replaced',
        'Whether anyone locally has fitted it before',
      ],
    },
    {
      type: 'imageGrid',
      title: 'Three that earn their place',
      columns: 3,
      items: [
        { image: ARTICLE_PHOTOS.materials, caption: 'Fly-ash blocks' },
        { image: ARTICLE_PHOTOS.loft, caption: 'Engineered timber' },
        { image: ARTICLE_PHOTOS.glassLiving, caption: 'Low-e glazing' },
      ],
    },
    {
      type: 'quote',
      text: 'The most sustainable material is usually the one already on site.',
    },
  ],

  // ─────────────────────────────────────────────
  'smart-homes-future-of-living': [
    {
      type: 'lead',
      text: 'A smart home is not a house full of apps. It is a house where the things people do *every day* take one step instead of three.',
    },
    { type: 'heading', number: 1, level: 2, text: 'Worth automating' },
    {
      type: 'iconGrid',
      columns: 3,
      items: [
        { icon: 'clock', title: 'Lighting scenes', body: 'One switch for a whole room, not six.' },
        { icon: 'shield', title: 'Entry and cameras', body: 'The one thing people check from away.' },
        { icon: 'chart', title: 'Energy metering', body: 'You cannot reduce what you cannot see.' },
      ],
    },
    { type: 'heading', number: 2, level: 2, text: 'Rarely worth it' },
    {
      type: 'bullets',
      items: [
        'Anything that fails closed when the internet drops',
        'A screen where a switch worked',
        'Automation that only the person who installed it understands',
      ],
    },
    {
      type: 'quote',
      text: 'If the house stops working when the Wi-Fi does, it was never a smart house.',
    },
  ],

  // ─────────────────────────────────────────────
  'biophilic-design-nature-architecture': [
    {
      type: 'lead',
      text: 'Biophilic design is not potted plants. It is daylight, view, air movement and natural material — the four things a room is measurably better for having.',
    },
    { type: 'heading', number: 1, level: 2, text: 'The four that matter' },
    {
      type: 'cards',
      items: [
        { icon: 'star', title: 'Daylight' },
        { icon: 'map', title: 'A view out' },
        { icon: 'box', title: 'Moving air' },
        { icon: 'check', title: 'Real material' },
      ],
    },
    {
      type: 'imageGrid',
      columns: 3,
      items: [
        { image: ARTICLE_PHOTOS.biophilic, caption: 'Planting at eye level' },
        { image: ARTICLE_PHOTOS.naturalLighting, caption: 'Daylight from two sides' },
        { image: ARTICLE_PHOTOS.glassLiving, caption: 'An uninterrupted view' },
      ],
    },
    {
      type: 'quote',
      text: 'A window onto something growing does more for a room than any surface you can specify.',
    },
  ],

  // ─────────────────────────────────────────────
  'minimalist-architecture-less-is-more': [
    {
      type: 'lead',
      text: 'Minimalism is the **most expensive** way to build badly and the cheapest way to build well. There is nothing left to hide a mistake behind.',
    },
    { type: 'heading', number: 1, level: 2, text: 'Why it is harder' },
    {
      type: 'para',
      text: 'Every junction is visible, every tolerance is read, and every service has to be planned rather than boxed in afterwards. The drawing set is longer, not shorter.',
    },
    {
      type: 'iconGrid',
      columns: 3,
      items: [
        { icon: 'settings', title: 'Tolerances', body: 'Set on the drawing, not on site.' },
        { icon: 'grid', title: 'Services', body: 'Routed before the walls are set out.' },
        { icon: 'shield', title: 'Storage', body: 'Planned in, or the room fills up anyway.' },
      ],
    },
    {
      type: 'quote',
      text: 'You cannot decorate your way out of a plan that does not work.',
    },
  ],

  // ─────────────────────────────────────────────
  'how-to-choose-the-right-architect': [
    {
      type: 'lead',
      text: 'Portfolios all look good. What separates one architect from another is how they answer the **awkward** questions.',
    },
    { type: 'heading', number: 1, level: 2, text: 'Ask these before you sign' },
    {
      type: 'numbered',
      items: [
        { title: 'What is not included?', body: 'A fee that covers less is not a lower fee.' },
        { title: 'Who draws it?', body: 'The person in the meeting is not always the person at the desk.' },
        { title: 'What went wrong last time?', body: 'Everyone has a project that went sideways. Listen to how it is described.' },
        { title: 'How are changes charged?', body: 'Agree it while nobody is under pressure.' },
      ],
    },
    {
      type: 'cta',
      title: 'Looking for someone in your area?',
      body: 'Every PIN code on ArchFacing has a professional who holds its PACT.',
      buttonText: 'Consult Nearby',
      buttonUrl: '/consult-nearby',
    },
  ],

  // ─────────────────────────────────────────────
  'low-cost-construction-ideas': [
    {
      type: 'lead',
      text: 'Building cheaply and building badly are not the same thing. The difference is **which** corners you cut.',
    },
    { type: 'heading', number: 1, level: 2, text: 'Safe to economise on' },
    {
      type: 'bullets',
      items: [
        'Finishes — they can be upgraded later, one room at a time',
        'Fittings, where a cheaper one is the same fitting in a different box',
        'Built-in furniture, which can wait a year',
        'Landscaping, which improves on its own',
      ],
    },
    { type: 'heading', number: 2, level: 2, text: 'Never' },
    {
      type: 'cards',
      items: [
        { icon: 'shield', title: 'Structure' },
        { icon: 'box', title: 'Waterproofing' },
        { icon: 'settings', title: 'Buried services' },
        { icon: 'check', title: 'Foundations' },
      ],
    },
    {
      type: 'quote',
      text: 'Anything you would have to break a wall to reach is the wrong place to save money.',
    },
  ],

  // ─────────────────────────────────────────────
  'future-of-workspaces': [
    {
      type: 'lead',
      text: 'Most offices are redesigned around how they *look* in a photograph. The things that change how well people work are almost invisible.',
    },
    { type: 'heading', number: 1, level: 2, text: 'What measurably helps' },
    {
      type: 'iconGrid',
      columns: 3,
      items: [
        { icon: 'shield', title: 'Acoustic separation', body: 'The commonest complaint, and the cheapest to fix.' },
        { icon: 'star', title: 'Daylight at the desk', body: 'Not daylight somewhere in the floorplate.' },
        { icon: 'box', title: 'Somewhere to be alone', body: 'One quiet room per floor changes a whole office.' },
      ],
    },
    { type: 'heading', number: 2, level: 2, text: 'What only looks like it helps' },
    {
      type: 'bullets',
      items: [
        'Breakout furniture nobody sits in twice',
        'Glass walls that carry every sound',
        'Open plan with no alternative to it',
      ],
    },
    {
      type: 'quote',
      text: 'People do not need a better office. They need one place in it where nobody can reach them.',
    },
  ],

  // ─────────────────────────────────────────────
  'vastu-in-modern-architecture': [
    {
      type: 'lead',
      text: 'Most Vastu principles predate air conditioning and describe how to keep a house comfortable in the Indian climate. Read that way, a great deal of it is **ordinary passive design**.',
    },
    { type: 'heading', number: 1, level: 2, text: 'Where it agrees with the physics' },
    {
      type: 'numbered',
      items: [
        { title: 'Kitchen to the south-east', body: 'Morning sun, and the heat kept away from the evening rooms.' },
        { title: 'Openings to the north and east', body: 'Light without the western afternoon load.' },
        { title: 'Heavy mass to the south-west', body: 'Thermal lag exactly where the sun is hardest.' },
        { title: 'An open centre', body: 'A courtyard moves air through the whole plan.' },
      ],
    },
    {
      type: 'para',
      text: 'Where a rule and a client disagree, say which is which. Treating every principle as structural — or dismissing all of them — both end badly.',
    },
    {
      type: 'quote',
      text: 'Follow it where it keeps the house cool. Say so plainly where it only keeps the peace.',
    },
  ],
}
