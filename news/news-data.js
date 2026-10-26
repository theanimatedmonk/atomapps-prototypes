// Topics for the menu and the stories each topic page shows (every page uses the same feed layout).
// Mock content: the first four stories come from the Figma file, the rest are made-up copy with
// Wikimedia Commons photos (credits in assets/CREDITS.md).
const TOPICS = [
  { id: 'top-stories', name: 'Top Stories', stories: ['politics', 'ai', 'pyramid'] },
  { id: 'business', name: 'Business', stories: ['fourday', 'mortgage'] },
  { id: 'entertainment', name: 'Entertainment', stories: ['boxoffice', 'livestream'] },
  { id: 'general', name: 'General', stories: ['libraries', 'transit', 'politics'] },
  { id: 'health', name: 'Health', stories: ['pyramid', 'walks', 'sleep'] },
  { id: 'science', name: 'Science', stories: ['galaxy', 'reefs'] },
  { id: 'sports', name: 'Sports', stories: ['qb', 'equaliser'] },
  { id: 'technology', name: 'Technology', stories: ['ai', 'battery'] },
];

const STORIES = {
  politics: {
    tag: 'Politics', image: 'assets/story-politics.png', source: 'CNN', time: '21 minutes ago',
    title: "As America turns 250, Trump should restore Washington, DC's original borders",
    excerpt: 'Virginia Democrats just proposed an electoral map that would potentially give Democrats 10 of the state’s 11 representatives in the House. In a state that voted 46% for Trump, it is outlandish to on...',
  },
  ai: {
    tag: 'Politics', image: 'assets/story-ai.png', source: 'Paul Steinhauser', time: '1 hour ago',
    title: 'AI power players pour cash into competitive primaries as 2026 midterms heat up',
    excerpt: "A political group backed by leading AI companies and innovators is starting to dip into its formidable war chest to back candidates in competitive primaries in this year's midterm elections. Fox News Digital...",
  },
  pyramid: {
    tag: 'Health', image: 'assets/story-health.png', source: 'Angelica Stabile', time: '2 hours ago',
    title: 'Food pyramid backlash: Low-fat era may have fueled obesity, diabetes, says doctor',
    excerpt: 'The Trump administration’s January rollout of the new, inverted food pyramid has sparked some debate in nutrition circles, as it places a stronger emphasis on dairy, red meats and foods higher in fat. The top of t...',
  },
  qb: {
    tag: 'Sports', image: 'assets/story-sports.png', source: 'Scott Thompson', time: '35 minutes ago',
    title: 'Bill Belichick adds third quarterback to UNC roster this offseason after disappointing fir...',
    excerpt: 'Dickens enjoyed a 3,508-yard 2025 season with 38 touchdowns to only two interceptions. And he has thrown for 5,063 yards with 51 touchdowns and five interceptions with a 74% completion rate i...',
  },

  fourday: {
    tag: 'Business', image: 'assets/story-fourday.jpg', source: 'Market Desk', time: '1 hour ago',
    title: 'Small businesses turn to four-day weeks to hold on to staff',
    excerpt: 'Owners say shorter weeks have cut turnover and sick days, though some warn the model is harder to run in shops that need cover six days a week.',
  },
  mortgage: {
    tag: 'Business', image: 'assets/story-mortgage.jpg', source: 'Money Brief', time: '3 hours ago',
    title: 'Mortgage rates dip for a third straight week as buyers return',
    excerpt: 'Lower borrowing costs are bringing first-time buyers back to open houses, but agents say tight supply is still pushing prices up in most cities.',
  },
  boxoffice: {
    tag: 'Entertainment', image: 'assets/story-boxoffice.jpg', source: 'Screen Weekly', time: '2 hours ago',
    title: 'Summer box office ends on a high as original films outperform sequels',
    excerpt: 'Three of the season’s five biggest hits were new stories, a shift studios say will shape what gets made over the next few years.',
  },
  livestream: {
    tag: 'Entertainment', image: 'assets/story-livestream.jpg', source: 'Screen Weekly', time: '5 hours ago',
    title: 'Streaming services bet on live events to keep subscribers watching',
    excerpt: 'Concerts, award shows and live sport are moving to streaming apps as platforms look for reasons to stop viewers cancelling between big releases.',
  },
  libraries: {
    tag: 'General', image: 'assets/story-libraries.jpg', source: 'City Desk', time: '45 minutes ago',
    title: 'City libraries extend weekend hours after record visitor numbers',
    excerpt: 'Branches will stay open until 8pm on Saturdays and Sundays, with extra study space and free workshops added for students during exam season.',
  },
  transit: {
    tag: 'General', image: 'assets/story-transit.jpg', source: 'City Desk', time: '4 hours ago',
    title: 'Commuters get real-time crowding alerts as transit apps add new features',
    excerpt: 'Riders can now see how full the next train is before it arrives, part of a wider push to spread out the morning rush.',
  },
  walks: {
    tag: 'Health', image: 'assets/story-walks.jpg', source: 'Wellness Report', time: '3 hours ago',
    title: 'Short walks after meals may help steady blood sugar, researchers say',
    excerpt: 'Even two to five minutes of light walking after eating was linked to smaller spikes in blood sugar compared with sitting, according to a review of recent studies.',
  },
  sleep: {
    tag: 'Health', image: 'assets/story-sleep.jpg', source: 'Wellness Report', time: '6 hours ago',
    title: 'How much sleep do teenagers really need? Doctors weigh in',
    excerpt: 'Most teens need eight to ten hours a night, yet surveys suggest fewer than a third get it on school nights. Here is what helps.',
  },
  galaxy: {
    tag: 'Science', image: 'assets/story-galaxy.jpg', source: 'Science Today', time: '2 hours ago',
    title: 'Astronomers spot a rare double-ringed galaxy in a deep-sky survey',
    excerpt: 'The galaxy’s two rings of young stars likely formed after a smaller galaxy passed straight through its centre hundreds of millions of years ago.',
  },
  reefs: {
    tag: 'Science', image: 'assets/story-reefs.jpg', source: 'Science Today', time: '7 hours ago',
    title: 'Ocean robots map coral reefs faster than teams of divers',
    excerpt: 'Small underwater drones surveyed a reef in a day that would take divers weeks, giving scientists a clearer picture of where coral is recovering.',
  },
  equaliser: {
    tag: 'Sports', image: 'assets/story-equaliser.jpg', source: 'Matchday', time: '1 hour ago',
    title: 'Late equaliser sends the title race into the final weekend',
    excerpt: 'A stoppage-time header kept the leaders’ lead at two points, setting up a final round where three teams can still finish top.',
  },
  battery: {
    tag: 'Technology', image: 'assets/story-battery.jpg', source: 'Tech Brief', time: '4 hours ago',
    title: 'Phone makers put longer battery life ahead of thinner designs',
    excerpt: 'After years of slimmer handsets, this season’s phones are slightly thicker, trading millimetres for batteries that last well into a second day.',
  },
};
