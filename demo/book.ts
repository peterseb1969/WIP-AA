/**
 * "The Lantern Keeper's Tide" — a short demo novel that touches every
 * AuthorAssist feature. One source for both outputs of
 * tools/load-demo-book.ts: the complete book written into a namespace, and
 * demo/manuscript.txt for testing the import.
 *
 * Shapes follow server/seed/templates. Entity documents store display names
 * and references store term values, as an imported book does. Every term
 * lists its label among its aliases, because a label alone does not resolve.
 *
 * Deliberate features (see demo/README.md for the full list):
 * - duplicates an import leaves behind, for Merge: Old Wick / Edmund Wick,
 *   The Lighthouse / Cape Varn Light, Missing logbook / The missing logbook
 * - names inside names ("Tam" in "Tamsin") and accents (Inès, Café Morvan,
 *   Margit Söll) for the scene check's whole-word matching
 * - scene-check suggestions: Tamsin appears in "The Salvage Claim" without
 *   being tagged; "Low Water" has dismissed Margit Söll
 * - out-of-order story time: a flashback, a dream, a backstory event that
 *   is in no chapter
 */

export interface Term { value: string; label: string; aliases: string[] }

export const project = {
  title: "The Lantern Keeper's Tide",
  author: 'Ada Penrose',
  genre: 'MYSTERY',
  time_system: 'CALENDAR',
  description: 'A new keeper on a remote island learns why the light went dark on the night of a wreck, twenty-six years before.',
  setting_summary: 'Cape Varn, a granite island in a northern strait, autumn 1937; one harbour town, one lighthouse, one ferry.',
}

export const characterTerms: Term[] = [
  { value: 'WREN_HALLOWAY', label: 'Wren Halloway', aliases: ['Wren Halloway', 'Wren', 'Miss Halloway'] },
  { value: 'EDMUND_WICK', label: 'Edmund Wick', aliases: ['Edmund Wick', 'Edmund'] },
  { value: 'OLD_WICK', label: 'Old Wick', aliases: ['Old Wick'] },
  { value: 'INES_DUVAL', label: 'Inès Duval', aliases: ['Inès Duval', 'Inès', 'Madame Duval'] },
  { value: 'TAM_BRENNICK', label: 'Tam Brennick', aliases: ['Tam Brennick', 'Tam', 'Brennick'] },
  { value: 'TAMSIN_BRENNICK', label: 'Tamsin Brennick', aliases: ['Tamsin Brennick', 'Tamsin'] },
  { value: 'ROWAN_ASHE', label: 'Rowan Ashe', aliases: ['Rowan Ashe', 'Captain Ashe', 'the Captain'] },
  { value: 'MARGIT_SOLL', label: 'Margit Söll', aliases: ['Margit Söll', 'Margit'] },
  { value: 'ELIAS_HALLOWAY', label: 'Elias Halloway', aliases: ['Elias Halloway', 'Elias'] },
]

export const locationTerms: Term[] = [
  { value: 'CAPE_VARN_LIGHT', label: 'Cape Varn Light', aliases: ['Cape Varn Light', 'the Light'] },
  { value: 'THE_LIGHTHOUSE', label: 'The Lighthouse', aliases: ['The Lighthouse'] },
  { value: 'LAMP_ROOM', label: 'The Lamp Room', aliases: ['The Lamp Room', 'lamp room'] },
  { value: 'VARNHOLM', label: 'Varnholm', aliases: ['Varnholm'] },
  { value: 'CAFE_MORVAN', label: 'Café Morvan', aliases: ['Café Morvan', 'the café'] },
  { value: 'THE_NARROWS', label: 'The Narrows', aliases: ['The Narrows'] },
  { value: 'GREY_GULL', label: 'The Grey Gull', aliases: ['The Grey Gull', 'the ferry'] },
  { value: 'SAINT_BRANNOCS', label: "Saint Brannoc's Chapel", aliases: ["Saint Brannoc's Chapel", "Saint Brannoc's", 'the chapel'] },
]

export const threadTerms: Term[] = [
  { value: 'WHO_PUT_OUT_THE_LIGHT', label: 'Who put out the light', aliases: ['Who put out the light'] },
  { value: 'THE_MISSING_LOGBOOK', label: 'The missing logbook', aliases: ['The missing logbook'] },
  { value: 'MISSING_LOGBOOK', label: 'Missing logbook', aliases: ['Missing logbook'] },
  { value: 'WREN_AND_TAMSIN', label: 'Wren and Tamsin', aliases: ['Wren and Tamsin'] },
  { value: 'BRENNICK_SALVAGE', label: "Brennick's salvage claim", aliases: ["Brennick's salvage claim"] },
  { value: 'THE_DROWNED_BELL', label: 'The drowned bell', aliases: ['The drowned bell'] },
]

export const characters = [
  {
    name: 'Wren Halloway', role: 'PROTAGONIST', age: '29',
    description: 'Tall, sea-grey eyes, a borrowed oilskin two sizes too large.',
    personality: 'Patient until she is not; counts things when she is nervous.',
    backstory: "Daughter of Elias Halloway, the keeper who was blamed for the wreck of the Marguerite in 1911. Raised inland by an aunt who never spoke of him.",
    goals: 'Keep the light for one winter and find out what her father did that night.',
    flaws: 'Trusts records more than people.',
    voice_notes: 'Short sentences. Notices weather before faces.',
    arc_summary: 'From proving her father guilty or innocent to accepting that the island kept a secret to protect him.',
    relationships: [
      { character: 'ELIAS_HALLOWAY', relationship_type: 'CHILD_OF', end_time: 1911 },
      { character: 'EDMUND_WICK', relationship_type: 'PROTEGE', start_time: 1937 },
      { character: 'TAMSIN_BRENNICK', relationship_type: 'FRIEND', start_time: 1937, description: 'Wary at first; allies by the storm.' },
      { character: 'TAM_BRENNICK', relationship_type: 'RIVAL', start_time: 1937 },
    ],
  },
  {
    name: 'Edmund Wick', role: 'DEUTERAGONIST', age: '71',
    description: 'Keeper of Cape Varn Light for forty years; retiring the week Wren arrives.',
    personality: 'Courteous, evasive, kind to the lamp and to nobody else.',
    backstory: "Assistant keeper under Elias Halloway in 1911. Was on the gallery when the light went out.",
    goals: 'Leave the island with his secret intact.',
    flaws: 'Mistakes silence for loyalty.',
    voice_notes: 'Calls the lamp "she". Never finishes a sentence about 1911.',
    relationships: [
      { character: 'WREN_HALLOWAY', relationship_type: 'MENTOR', start_time: 1937 },
      { character: 'ELIAS_HALLOWAY', relationship_type: 'COLLEAGUE', start_time: 1904, end_time: 1911 },
    ],
  },
  // A duplicate the import would produce from the townsfolk's name for him: merge into Edmund Wick.
  { name: 'Old Wick', role: 'MINOR', description: 'What Varnholm calls the keeper.', backstory: 'Known to every child in Varnholm for the ginger biscuits he keeps in the oil store.' },
  {
    name: 'Inès Duval', role: 'SUPPORTING', age: '52',
    description: 'Runs Café Morvan; came from Brittany as a girl and never lost the accent.',
    personality: 'Generous with soup, sparing with gossip, which makes her gossip worth having.',
    backstory: 'Her brother sailed on the Marguerite and did not come home.',
    relationships: [{ character: 'WREN_HALLOWAY', relationship_type: 'ALLY', start_time: 1937 }],
  },
  {
    name: 'Tam Brennick', role: 'ANTAGONIST', age: '58',
    description: 'Salvage merchant, harbour councillor, owner of half the boats in Varnholm.',
    personality: 'Loud and friendly in company, quiet and exact on paper.',
    backstory: 'His father bought the salvage rights to the Marguerite the week after she sank.',
    goals: 'Raise what is left of the Marguerite before anyone reads the 1911 logbook.',
    flaws: "Believes his father's debts are his own.",
    relationships: [
      { character: 'TAMSIN_BRENNICK', relationship_type: 'PARENT_OF' },
      { character: 'WREN_HALLOWAY', relationship_type: 'RIVAL', start_time: 1937 },
    ],
  },
  {
    name: 'Tamsin Brennick', role: 'SUPPORTING', age: '24',
    description: "Tam's daughter; keeps the harbour books and rows better than anyone on the island.",
    personality: 'Blunt, funny, tired of her father.',
    goals: 'Leave Varnholm, but not before she knows what the family owes.',
    relationships: [
      { character: 'TAM_BRENNICK', relationship_type: 'CHILD_OF' },
      { character: 'WREN_HALLOWAY', relationship_type: 'FRIEND', start_time: 1937 },
    ],
  },
  {
    name: 'Rowan Ashe', role: 'MINOR', age: '45',
    description: 'Captain of The Grey Gull, the only ferry through The Narrows.',
    personality: 'Talks to the boat more than to passengers.',
    relationships: [{ character: 'INES_DUVAL', relationship_type: 'ROMANTIC', start_time: 1930 }],
  },
  { name: 'Margit Söll', role: 'MINOR', age: '63', description: 'Postmistress of Varnholm; reads every postcard, forwards none of the gossip.', personality: 'Precise, Lutheran, secretly delighted by scandal.' },
  {
    name: 'Elias Halloway', role: 'MENTIONED', age: '41 (in 1911)',
    description: "Keeper of Cape Varn Light until the night of the Marguerite.",
    backstory: 'Dismissed after the inquiry; died in 1912 on the mainland.',
  },
]

export const locations = [
  { name: 'Cape Varn Light', type: 'BUILDING', description: 'A white granite tower on the northern point, sixty-two steps to the lamp.', atmosphere: 'Wind in the stairwell like someone breathing.', rules: 'The light is lit at sunset and never left unattended.', significance: 'Where the light went out in 1911.' },
  { name: 'The Lighthouse', type: 'BUILDING', description: 'The tower on the point, as the import read it.' },
  { name: 'The Lamp Room', type: 'ROOM', description: 'Brass, glass and paraffin; the Fresnel lens turns on a bath of mercury.', atmosphere: 'Warm and bright and very small.' },
  { name: 'Varnholm', type: 'TOWN', description: 'The harbour town: forty houses, two chapels, one café.', atmosphere: 'Everyone knows the tide tables and nobody says what they think.' },
  { name: 'Café Morvan', type: 'BUILDING', description: "Inès Duval's café on the quay, steamed windows, a wireless that only gets Oslo.", significance: 'Where Varnholm talks.' },
  { name: 'The Narrows', type: 'OUTDOOR', description: 'The strait between Cape Varn and the mainland; a tide race twice a day.', rules: 'No crossing in a westerly above force six.', significance: 'Where the Marguerite went down.' },
  { name: 'The Grey Gull', type: 'VEHICLE', description: 'A steam ferry with one funnel and a list to port.' },
  { name: "Saint Brannoc's Chapel", type: 'BUILDING', description: 'A roofless chapel above the harbour; the bell was lost at sea in 1911.', atmosphere: 'Gulls nest in the pulpit.' },
]

export const threads = [
  { title: 'WHO_PUT_OUT_THE_LIGHT', status: 'RESOLVED', description: 'Who let the light go dark on the night of the Marguerite, and why.', opened_chapter: 1, resolved_chapter: 5, characters: ['WREN_HALLOWAY', 'EDMUND_WICK', 'ELIAS_HALLOWAY'] },
  { title: 'THE_MISSING_LOGBOOK', status: 'RESOLVED', description: 'The 1911 logbook is missing from the shelf.', opened_chapter: 2, resolved_chapter: 4, characters: ['WREN_HALLOWAY', 'EDMUND_WICK'] },
  { title: 'MISSING_LOGBOOK', status: 'OPEN', description: 'Duplicate from the import: merge into "The missing logbook".' },
  { title: 'WREN_AND_TAMSIN', status: 'DEVELOPING', description: 'Two women who each inherited a story about 1911.', opened_chapter: 3, characters: ['WREN_HALLOWAY', 'TAMSIN_BRENNICK'] },
  { title: 'BRENNICK_SALVAGE', status: 'CLIMAX', description: 'Tam wants to raise the Marguerite before winter.', opened_chapter: 2, characters: ['TAM_BRENNICK', 'TAMSIN_BRENNICK'] },
  { title: 'THE_DROWNED_BELL', status: 'ABANDONED', description: "The legend of Saint Brannoc's bell ringing under the water. Cut: it competed with the light.", opened_chapter: 3 },
]

type Scene = {
  key: string
  title: string
  event_type: string
  story_time_raw: string
  story_time_sort: number
  location?: string
  characters: string[]
  plot_threads?: string[]
  summary: string
  emotional_beat?: string
  notes?: string
  suppressed_suggestions?: string[]
  prose: string[]
}

export type Chapter = {
  key: string
  /** How the manuscript writes the heading (the import parser reads it). */
  heading: string
  title: string
  summary?: string
  themes?: string[]
  status?: string
  pov_character?: string
  notes?: string
  number_start?: number
  unnumbered?: boolean
  scenes: Scene[]
}

const p = (...paras: string[]) => paras

export const chapters: Chapter[] = [
  {
    key: 'prologue', heading: 'Prologue', title: 'Prologue', status: 'FINAL', unnumbered: true,
    summary: 'The night of the Marguerite, 1911.',
    scenes: [{
      key: 'dark', title: 'The Night the Light Went Out', event_type: 'PROLOGUE',
      story_time_raw: '14 November 1911, 02:10', story_time_sort: 19111114,
      location: 'CAPE_VARN_LIGHT', characters: ['ELIAS_HALLOWAY', 'EDMUND_WICK'], plot_threads: ['WHO_PUT_OUT_THE_LIGHT'],
      summary: 'The light fails; a ship screams on the rocks; Elias and Edmund on the gallery.',
      emotional_beat: 'Dread',
      prose: p(
        'At ten past two the light went out, and for eleven seconds Cape Varn was a rock like any other rock.',
        'Elias Halloway was on the stair when it happened. He knew by the silence before he knew by the dark: the clockwork stopped, the lens stopped, and the wind came up the tower as if it had been waiting.',
        'On the gallery Edmund was shouting something that the gale took away. Below them, out in The Narrows, a ship\'s whistle began and did not stop.',
        'Elias struck a match. It showed him his own hand, shaking, and the brass of the lamp, cold.',
      ),
    }],
  },
  {
    key: 'ch1', heading: 'Chapter 1: The Grey Gull', title: 'The Grey Gull', status: 'REVISED', pov_character: 'WREN_HALLOWAY',
    themes: ['arrival', 'inheritance'], summary: 'Wren crosses to Cape Varn and meets the island.',
    notes: 'Keep the crossing short; the island should feel close and closed.',
    scenes: [
      {
        key: 'crossing', title: 'Crossing the Narrows', event_type: 'SCENE',
        story_time_raw: '2 October 1937, afternoon', story_time_sort: 19371002,
        location: 'GREY_GULL', characters: ['WREN_HALLOWAY', 'ROWAN_ASHE'], plot_threads: ['WHO_PUT_OUT_THE_LIGHT'],
        summary: 'Captain Ashe ferries Wren across and tells her where the Marguerite lies.',
        prose: p(
          'The Grey Gull leaned into The Narrows as if she had a grudge against it. Wren Halloway stood at the rail and counted the waves until she lost count.',
          '"You\'re the new keeper," said Captain Ashe, not as a question. He had not looked at her once since Varnholm came into sight; he looked at the water.',
          '"For the winter."',
          '"Winters are long here." He lifted his chin at a patch of sea that was no different from any other. "That\'s where she went down. The Marguerite. Your name\'s Halloway."',
          'Wren said nothing. She had expected the island to know. She had not expected it to point.',
        ),
      },
      {
        key: 'cafe', title: 'Soup at Café Morvan', event_type: 'SCENE',
        story_time_raw: '2 October 1937, evening', story_time_sort: 19371002,
        location: 'CAFE_MORVAN', characters: ['WREN_HALLOWAY', 'INES_DUVAL'],
        summary: 'Inès feeds Wren and warns her about the Brennicks.',
        prose: p(
          'Café Morvan smelled of onions and wet wool. Inès Duval put a bowl in front of Wren before she had asked for anything.',
          '"You will want to know about your father," Inès said. "Everyone will tell you. Eat first."',
          'The wireless on the shelf found Oslo, lost it, found it again. Through the steamed window Wren watched a big man in a good coat cross the quay and stop to read the notice board.',
          '"Tam Brennick," said Inès. "He owns the boats. And the salvage of the Marguerite, since his father bought it." She wiped the counter that was already clean. "My brother was on that ship. So now you know two things."',
        ),
      },
      {
        key: 'keeper', title: 'The Keeper\'s Welcome', event_type: 'SCENE',
        story_time_raw: '2 October 1937, night', story_time_sort: 19371002,
        location: 'CAPE_VARN_LIGHT', characters: ['WREN_HALLOWAY', 'EDMUND_WICK'], plot_threads: ['WHO_PUT_OUT_THE_LIGHT'],
        summary: 'Edmund Wick receives Wren at the Light and does not mention her father.',
        prose: p(
          'Edmund Wick met her at the door of Cape Varn Light with a lantern he did not need; the beam was already turning above them.',
          '"Miss Halloway." He took her bag. "She\'s lit at sunset. You\'ll learn her."',
          'He showed her the kitchen, the oil store, the sixty-two steps. He showed her how the clockwork was wound and where the spare mantles were kept. He did not show her anything that had been there in 1911, and he did not say her father\'s name.',
          'At the top, in the warm bright room, Wren put her hand on the brass and found it hot. She thought: it was cold, that night. Somebody let it go cold.',
        ),
      },
    ],
  },
  {
    // Stored title is only the number: the app shows it as an untitled chapter with its computed number.
    key: 'ch2', heading: 'Chapter 2', title: 'Chapter 2', status: 'DRAFT', pov_character: 'WREN_HALLOWAY',
    themes: ['records', 'secrets'],
    scenes: [
      {
        // Imported-style title: the app drops the "Ch2 " prefix when it shows it.
        key: 'shelf', title: 'Ch2 Scene 1', event_type: 'SCENE',
        story_time_raw: '5 October 1937', story_time_sort: 19371005,
        location: 'LAMP_ROOM', characters: ['WREN_HALLOWAY', 'OLD_WICK'], plot_threads: ['THE_MISSING_LOGBOOK'],
        summary: 'The logbooks run from 1874 to 1937 with one gap.',
        prose: p(
          'The logbooks lived on a shelf in The Lamp Room, sixty-three of them in faded green cloth, one for every year since the Light was built.',
          'Sixty-two, Wren counted, and counted again. 1910 sat against 1912 as if they had always been neighbours.',
          'Old Wick was polishing the lens with a chamois and did not turn round. "Damp got it," he said. "Years back."',
          '"Damp got one book out of sixty-three."',
          '"She\'s a wet tower." He folded the chamois into a perfect square. "You\'ll want to get the mantles in before the weather."',
        ),
      },
      {
        key: 'salvage', title: 'The Salvage Claim', event_type: 'SCENE',
        story_time_raw: '6 October 1937', story_time_sort: 19371006,
        location: 'CAPE_VARN_LIGHT',
        // Tamsin is in the prose but not tagged: the scene check suggests her.
        characters: ['WREN_HALLOWAY', 'TAM_BRENNICK'], plot_threads: ['BRENNICK_SALVAGE'],
        summary: 'Tam Brennick visits to ask the new keeper to light the reef for his divers.',
        prose: p(
          'Tam Brennick came up the path in the rain without a hat, as if weather were something that happened to other people. His daughter Tamsin stayed by the boat, arms folded, looking at the sea.',
          '"Divers," he said, at the kitchen table, "need a mark at night. You\'d hang a lamp on the reef for me. The Board won\'t mind."',
          '"The Board would mind very much."',
          'He smiled as if she had agreed. "Your father would have done it. Elias liked a favour." He let that sit. "Think on it, Miss Halloway."',
          'When he had gone Wren went to the window. Tamsin was rowing, not her father; he sat in the stern with his hands in his pockets.',
        ),
      },
      {
        key: 'flashback', title: 'Two Keepers, 1911', event_type: 'FLASHBACK',
        story_time_raw: '13 November 1911', story_time_sort: 19111113,
        location: 'LAMP_ROOM', characters: ['ELIAS_HALLOWAY', 'EDMUND_WICK'], plot_threads: ['WHO_PUT_OUT_THE_LIGHT'],
        summary: 'The night before the wreck: Elias asks Edmund to cover his watch.',
        notes: 'Told from Edmund\'s memory; keep it in the present tense to mark it.',
        prose: p(
          'Elias is laughing, which he does not often do. "One night," he says. "One watch. Brennick pays me for the mark on the reef and nobody is the worse for it."',
          'Edmund is twenty-five and wants very much to be liked. He winds the clockwork and says nothing, which Elias takes for yes.',
          'Outside, the barometer has begun to fall.',
        ),
      },
    ],
  },
  {
    key: 'ch3', heading: 'Chapter III: Tamsin', title: 'Tamsin', status: 'DRAFT', pov_character: 'WREN_HALLOWAY',
    themes: ['friendship'],
    scenes: [
      {
        key: 'post', title: 'Letters at the Post Office', event_type: 'SCENE',
        story_time_raw: '9 October 1937', story_time_sort: 19371009,
        location: 'VARNHOLM', characters: ['WREN_HALLOWAY', 'TAMSIN_BRENNICK', 'MARGIT_SOLL'], plot_threads: ['WREN_AND_TAMSIN'],
        summary: 'Tamsin and Wren meet properly over Margit Söll\'s counter.',
        prose: p(
          'Margit Söll weighed the parcel twice and read the address three times. "Mainland," she said, with disapproval.',
          '"It\'s a letter to the Board," said Wren.',
          '"About my father." Tamsin Brennick had come in behind her, dripping. "You may as well say it. Margit will have read it by Thursday."',
          'Margit stamped the parcel with dignity. Tamsin leaned on the counter beside Wren and spoke low. "He wants the wreck up before anyone asks what was on her. I keep his books. There\'s a payment in 1911 that isn\'t for salvage."',
        ),
      },
      {
        key: 'dream', title: 'The Bell Under the Water', event_type: 'DREAM',
        story_time_raw: '9 October 1937, night', story_time_sort: 19371010,
        location: 'THE_NARROWS', characters: ['WREN_HALLOWAY'], plot_threads: ['THE_DROWNED_BELL'],
        summary: 'Wren dreams of a bell ringing under The Narrows.',
        prose: p(
          'In the dream the sea is glass and Wren can walk on it. Under her feet, very far down, a bell is ringing, slow, the way a bell rings for a funeral.',
          'She kneels and puts her ear to the glass. The bell stops. Somebody below knocks back, twice.',
        ),
      },
      {
        key: 'storm', title: 'Storm Watch', event_type: 'SCENE',
        story_time_raw: '11 October 1937', story_time_sort: 19371011,
        location: 'LAMP_ROOM', characters: ['WREN_HALLOWAY', 'TAMSIN_BRENNICK', 'EDMUND_WICK'], plot_threads: ['WREN_AND_TAMSIN', 'WHO_PUT_OUT_THE_LIGHT'],
        summary: 'A westerly gale; the clockwork jams; Tamsin and Wren keep the lens turning by hand.',
        emotional_beat: 'Exhilaration',
        prose: p(
          'The westerly came in at dusk and by nine it was force nine. At half past ten the clockwork jammed.',
          'Wren and Tamsin turned the lens by hand, a quarter turn every fifteen seconds, counting aloud, while Edmund Wick knelt in the clock case with a lamp in his teeth.',
          '"This is what he did," Edmund said when the clock caught again, sitting back on his heels, grey in the face. "In 1911. This. Except nobody was turning."',
          'Tamsin looked at Wren. Wren kept counting.',
        ),
      },
    ],
  },
  {
    key: 'interlude', heading: 'Interlude: The Bell', title: 'The Bell', status: 'OUTLINE', unnumbered: true,
    notes: 'Probably cut: see the note "Cut the bell".',
    scenes: [{
      key: 'bell', title: 'What the Fishermen Say', event_type: 'INTERLUDE',
      story_time_raw: 'any winter', story_time_sort: 19000101,
      location: 'SAINT_BRANNOCS', characters: [], plot_threads: ['THE_DROWNED_BELL'],
      summary: "The legend of Saint Brannoc's bell.",
      prose: p(
        "In Varnholm they say that Saint Brannoc's bell went into the sea the same night as the Marguerite, and that it rings under The Narrows when somebody is about to lie.",
        'Nobody has heard it. Everybody knows somebody who has.',
      ),
    }],
  },
  {
    // Part two restarts the count: shown as Chapter 1 again.
    key: 'ch4', heading: 'Chapter 4 — The Logbook', title: 'Part Two: The Logbook', status: 'DRAFT', pov_character: 'WREN_HALLOWAY', number_start: 1,
    themes: ['truth', 'records'],
    scenes: [
      {
        key: 'chapel', title: "Found at Saint Brannoc's", event_type: 'SCENE',
        story_time_raw: '14 October 1937', story_time_sort: 19371014,
        location: 'SAINT_BRANNOCS', characters: ['WREN_HALLOWAY', 'TAMSIN_BRENNICK'], plot_threads: ['THE_MISSING_LOGBOOK', 'WREN_AND_TAMSIN'],
        summary: 'Under the pulpit of the roofless chapel, wrapped in oilcloth: the 1911 logbook.',
        prose: p(
          "Tamsin knew the chapel the way children know places adults have stopped visiting. She lifted the loose board under the pulpit as if she had done it a hundred times.",
          'Oilcloth, then sacking, then green cloth faded nearly white. 1911.',
          'The last entry was in Edmund Wick\'s hand, not Elias\'s. "Light extinguished 02.10 by order of the keeper. Mark lit on the reef for Mr Brennick. God forgive us."',
          'Wren read it twice. Then she read it a third time, because she had always trusted records more than people, and the record said it was both of them.',
        ),
      },
      {
        key: 'confront', title: 'Words at the Café', event_type: 'SCENE',
        story_time_raw: '15 October 1937', story_time_sort: 19371015,
        location: 'CAFE_MORVAN', characters: ['WREN_HALLOWAY', 'TAM_BRENNICK', 'INES_DUVAL'], plot_threads: ['BRENNICK_SALVAGE', 'WHO_PUT_OUT_THE_LIGHT'],
        summary: 'Wren lays the logbook on the counter in front of Tam Brennick; Inès hears it.',
        prose: p(
          'Wren put the logbook on the counter of Café Morvan between Tam Brennick\'s coffee and his newspaper.',
          '"Your father paid mine to put out the light so his boat could find the reef in the dark," she said. "The Marguerite found it instead."',
          'Inès Duval set down the pot very carefully. The wireless had found Oslo; nobody turned it off.',
          'Tam did not open the book. "Salvage is legal," he said, but his voice had gone quiet and exact, the voice he used on paper.',
        ),
      },
    ],
  },
  {
    key: 'ch5', heading: '## 5. Low Water', title: 'Low Water', status: 'DRAFT', pov_character: 'WREN_HALLOWAY',
    themes: ['forgiveness'],
    scenes: [
      {
        // Not "Low Water": WIP refuses a scene whose title is also a chapter's
        // title in the same namespace (identity not scoped per template, 2026-10-22).
        key: 'lowwater', title: 'The Bow at Low Water', event_type: 'SCENE',
        story_time_raw: '16 October 1937, spring tide', story_time_sort: 19371016,
        location: 'THE_NARROWS', characters: ['WREN_HALLOWAY', 'EDMUND_WICK', 'TAM_BRENNICK'], plot_threads: ['WHO_PUT_OUT_THE_LIGHT', 'BRENNICK_SALVAGE'],
        // Margit is mentioned in passing; the writer dismissed the suggestion to tag her.
        suppressed_suggestions: ['MARGIT_SOLL'],
        summary: 'At the lowest tide in twenty years the Marguerite\'s bow shows above water; Edmund tells the truth.',
        emotional_beat: 'Release',
        prose: p(
          'The spring tide went out further than anyone alive had seen. Even Margit Söll came down to the quay to look.',
          'Out in The Narrows the bow of the Marguerite stood up out of the water like a gravestone.',
          '"I lit the mark," Edmund said. He had come down from the Light in his good coat, the one for funerals. "Elias went down to stop me. He was on the stair when the light went out. I let it go out. Not him."',
          'Tam Brennick took off his hat for the first time anybody could remember. Beside Wren, Tamsin let out a breath she seemed to have held for twenty-six years.',
        ),
      },
      {
        key: 'relit', title: 'Relighting', event_type: 'SCENE',
        story_time_raw: '16 October 1937, sunset', story_time_sort: 19371016,
        location: 'LAMP_ROOM', characters: ['WREN_HALLOWAY', 'EDMUND_WICK'], plot_threads: ['WHO_PUT_OUT_THE_LIGHT'],
        summary: 'Edmund lights the lamp one last time and hands Wren the logbook to keep.',
        prose: p(
          'At sunset Edmund lit the lamp, as he had for forty years, and then stepped back and gave Wren the taper.',
          '"She\'s yours," he said. "Write it down. All of it."',
          'Wren opened the 1937 logbook and, under the date, wrote: Light lit 18.04. Keeper W. Halloway. Then, after a while: Correction to the record of 14 November 1911, follows.',
        ),
      },
    ],
  },
  {
    key: 'epilogue', heading: 'Epilogue', title: 'Epilogue', status: 'OUTLINE', unnumbered: true,
    scenes: [{
      key: 'year', title: 'A Year of Weather', event_type: 'EPILOGUE',
      story_time_raw: 'October 1938', story_time_sort: 19381001,
      location: 'CAPE_VARN_LIGHT', characters: ['WREN_HALLOWAY', 'TAMSIN_BRENNICK'], plot_threads: ['WREN_AND_TAMSIN'],
      summary: 'A year later Tamsin rows across with the post; the Light has a second keeper.',
      prose: p(
        'A year later the Board sent an assistant keeper, and the assistant keeper was Tamsin Brennick, who rowed better than anyone on the island and kept very good books.',
        'They wind the clockwork together at sunset. On the shelf in The Lamp Room there are sixty-four logbooks now, and none of them is missing.',
      ),
    }],
  },
]

/** An event in no chapter: shown on the Timeline only. */
export const backstory = {
  key: 'wreck', title: 'Wreck of the Marguerite', event_type: 'BACKSTORY',
  story_time_raw: '14 November 1911, 02:15', story_time_sort: 19111114,
  location: 'THE_NARROWS', characters: ['ELIAS_HALLOWAY', 'EDMUND_WICK', 'TAM_BRENNICK'], plot_threads: ['WHO_PUT_OUT_THE_LIGHT', 'BRENNICK_SALVAGE'],
  summary: 'The Marguerite strikes the reef in the dark; nineteen drowned, among them Inès Duval\'s brother.',
  prose: [] as string[],
}

export const notes = [
  { title: 'Cut the bell', note_type: 'REVISION', content: "The drowned-bell legend competes with the light. Cut the interlude, keep the dream as Wren's private image.", tags: ['structure', 'cut'], linked_plot_threads: ['THE_DROWNED_BELL'], linked_events: ['bell', 'dream'] },
  { title: "Edmund's voice", note_type: 'VOICE', content: 'Edmund never finishes a sentence about 1911 until Low Water. Then he speaks in full sentences only.', linked_characters: ['EDMUND_WICK'], linked_events: ['lowwater'] },
  { title: 'Fresnel lenses', note_type: 'RESEARCH', content: 'First-order lens, mercury bath, clockwork rotation; a jammed clock means turning by hand, a quarter turn every fifteen seconds for a 60-second character.', tags: ['lighthouse', 'technical'], linked_locations: ['LAMP_ROOM'] },
  { title: 'Records versus people', note_type: 'THEME', content: 'Wren trusts the record; the record lies by omission. The ending corrects the record rather than discarding it.', linked_characters: ['WREN_HALLOWAY'] },
  { title: 'Tamsin keeps the books', note_type: 'IDEA', content: 'Tamsin finds the 1911 payment in her father\'s ledgers before Wren finds the logbook: two records, one truth.', linked_characters: ['TAMSIN_BRENNICK', 'TAM_BRENNICK'], linked_plot_threads: ['BRENNICK_SALVAGE'] },
  { title: 'Ending options', note_type: 'BRAINSTORM', content: '1. Edmund confesses at low water. 2. Tam confesses instead. 3. Nobody confesses; the logbook speaks. Going with 1.', linked_events: ['lowwater'] },
]

export const worldRules = [
  { name: 'The light is never left', domain: 'Lighthouse Service', rule: 'From sunset to sunrise one keeper is always in the lamp room or on the stair.', implications: 'Edmund and Elias could not both have been below when the light went out.', exceptions: 'A keeper may leave to fetch oil if the assistant takes the watch.', related_characters: ['EDMUND_WICK', 'ELIAS_HALLOWAY', 'WREN_HALLOWAY'], related_locations: ['CAPE_VARN_LIGHT', 'LAMP_ROOM'] },
  { name: 'The Narrows tide race', domain: 'Geography', rule: 'Twice a day the tide runs at eight knots through The Narrows; slack water lasts twenty minutes.', implications: 'Ships must time the crossing; a light out for minutes is enough to wreck one.', related_locations: ['THE_NARROWS', 'GREY_GULL'] },
  { name: 'Salvage rights', domain: 'Law', rule: 'Whoever buys the salvage rights of a wreck owns what is raised, not what is learned.', implications: 'Tam can raise the Marguerite but cannot keep the logbook quiet.', related_characters: ['TAM_BRENNICK'] },
]

export const prompts = [
  { name: 'Island atmosphere check', description: 'Is the weather doing work in this scene?', context: ['SCENE_PROSE', 'LOCATION'], system_prompt: 'You are an editor of literary mysteries set in harsh landscapes.', user_prompt: 'Read this scene. Does the weather and setting carry mood and pressure, or is it decoration? Point to two sentences that could do more work.' },
  { name: 'Secret keeper consistency', description: "Check that a character's secret is kept consistently.", context: ['SCENE_PROSE', 'CHARACTERS', 'ADJACENT_SCENES'], system_prompt: 'You track what each character knows and hides across scenes.', user_prompt: 'For each character in this scene, list what they know about 1911 and whether anything they say contradicts the scenes before or after.' },
]

/** Images: generated as small PNGs by the loader. `attach` lists [kind, key, role]. */
export const images = [
  { file: 'wren-halloway.png', title: 'Wren Halloway', caption: 'Sketch for the cover.', credit: 'Demo art', color: [70, 110, 140], shape: 'portrait', attach: [['character', 'Wren Halloway', 'PORTRAIT']] },
  { file: 'edmund-wick.png', title: 'Edmund Wick', caption: 'Forty years on the Light.', color: [120, 95, 60], shape: 'portrait', attach: [['character', 'Edmund Wick', 'PORTRAIT']] },
  { file: 'cape-varn-map.png', title: 'Map of Cape Varn', caption: 'The island, The Narrows and the reef.', color: [60, 120, 90], shape: 'map', attach: [['location', 'Cape Varn Light', 'MAP'], ['location', 'The Narrows', 'MAP']] },
  { file: 'marguerite.png', title: 'The Marguerite', caption: 'The wreck at low water.', color: [40, 50, 70], shape: 'ship', attach: [['scene', 'lowwater', 'ILLUSTRATION'], ['thread', 'BRENNICK_SALVAGE', 'REFERENCE'], ['chapter', 'ch5', 'ILLUSTRATION']] },
  { file: 'logbook-1911.png', title: 'Logbook page, 1911', caption: 'The last entry, in Edmund\'s hand.', color: [200, 190, 150], shape: 'page', attach: [['note', 'Fresnel lenses', 'REFERENCE'], ['world_rule', 'The light is never left', 'REFERENCE']] },
  // Not attached anywhere: shows under the image library's "Not attached" filter.
  { file: 'varnholm-harbour.png', title: 'Varnholm harbour', caption: 'Unused sketch.', color: [150, 160, 175], shape: 'map', attach: [] },
] as const
