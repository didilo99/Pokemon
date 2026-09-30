/**
 * Authentic Rich Data for Pokémon Games
 */
window.RICH_GAMES_DATA = {
  // Gen 1
  red: {
    summary:
      "The original adventure that started it all. Capture, train, and battle with the original 151 Pokémon in the Kanto region.",
    starters: [1, 4, 7],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "1996-02-27", int: "1998-09-28" },
    platform: "Game Boy",
  },
  blue: {
    summary:
      "The companion to Red version. Explore Kanto and complete your Pokédex by trading version-exclusive Pokémon.",
    starters: [1, 4, 7],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "1996-10-15", int: "1998-09-28" },
    platform: "Game Boy",
  },
  yellow: {
    summary:
      "Journey with Pikachu as your constant companion in this special edition inspired by the Pokémon animated series.",
    starters: [25],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "1998-09-12", int: "1999-10-19" },
    platform: "Game Boy Color",
  },
  "red-japan": {
    summary: "The first ever Pokémon game released in Japan.",
    starters: [1, 4, 7],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "1996-02-27", int: "-" },
    platform: "Game Boy",
  },
  "green-japan": {
    summary: "The original companion to Pokémon Red, exclusive to Japan.",
    starters: [1, 4, 7],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "1996-02-27", int: "-" },
    platform: "Game Boy",
  },
  "blue-japan": {
    summary:
      "A special edition released in Japan with updated artwork and audio.",
    starters: [1, 4, 7],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "1996-10-15", int: "-" },
    platform: "Game Boy",
  },

  // Gen 2
  gold: {
    summary:
      "Uncover the secrets of the Johto region and discover 100 new Pokémon species in this classic sequel.",
    starters: [152, 155, 158],
    legendaries: [243, 244, 245, 249, 250],
    releaseDate: { jpn: "1999-11-21", int: "2000-10-15" },
    platform: "Game Boy Color",
  },
  silver: {
    summary:
      "Explore the vast Johto region, battle the Johto Gym Leaders, and challenge the Elite Four in this landmark RPG.",
    starters: [152, 155, 158],
    legendaries: [243, 244, 245, 249, 250],
    releaseDate: { jpn: "1999-11-21", int: "2000-10-15" },
    platform: "Game Boy Color",
  },
  crystal: {
    summary:
      "The definitive Gen 2 experience. The first game to feature animated Pokémon sprites and a female playable character.",
    starters: [152, 155, 158],
    legendaries: [243, 244, 245, 249, 250, 251],
    releaseDate: { jpn: "2000-12-14", int: "2001-07-29" },
    platform: "Game Boy Color",
  },

  // Gen 3
  ruby: {
    summary:
      "Travel to the tropical Hoenn region, stop Team Magma, and harness the power of Groudon.",
    starters: [252, 255, 258],
    legendaries: [377, 378, 379, 380, 381, 383],
    releaseDate: { jpn: "2002-11-21", int: "2003-03-19" },
    platform: "Game Boy Advance",
  },
  sapphire: {
    summary:
      "Explore Hoenn's diverse landscapes, thwart Team Aqua, and discover the legendary Kyogre.",
    starters: [252, 255, 258],
    legendaries: [377, 378, 379, 380, 381, 382],
    releaseDate: { jpn: "2002-11-21", int: "2003-03-19" },
    platform: "Game Boy Advance",
  },
  emerald: {
    summary:
      "The ultimate Hoenn adventure. Battle in the Battle Frontier and stop the conflict between Groudon and Kyogre.",
    starters: [252, 255, 258],
    legendaries: [377, 378, 379, 380, 381, 382, 383, 384],
    releaseDate: { jpn: "2004-09-16", int: "2005-05-01" },
    platform: "Game Boy Advance",
  },
  firered: {
    summary:
      "A stunning remake of the original Pokémon Red. Explore Kanto with updated graphics and new features.",
    starters: [1, 4, 7],
    legendaries: [144, 145, 146, 150, 243, 244, 245],
    releaseDate: { jpn: "2004-01-29", int: "2004-09-07" },
    platform: "Game Boy Advance",
  },
  leafgreen: {
    summary:
      "Return to where it all began in this refined remake of Pokémon Green. Discover the Sevii Islands.",
    starters: [1, 4, 7],
    legendaries: [144, 145, 146, 150, 243, 244, 245],
    releaseDate: { jpn: "2004-01-29", int: "2004-09-07" },
    platform: "Game Boy Advance",
  },

  // Gen 4
  diamond: {
    summary:
      "Venture through the Sinnoh region, stop Team Galactic, and encounter the legendary Dialga.",
    starters: [387, 390, 393],
    legendaries: [480, 481, 482, 483, 485, 486, 488],
    releaseDate: { jpn: "2006-09-28", int: "2007-04-22" },
    platform: "Nintendo DS",
  },
  pearl: {
    summary:
      "Explore the myths of Sinnoh, battle powerful trainers, and find the legendary Palkia.",
    starters: [387, 390, 393],
    legendaries: [480, 481, 482, 484, 485, 486, 488],
    releaseDate: { jpn: "2006-09-28", int: "2007-04-22" },
    platform: "Nintendo DS",
  },
  platinum: {
    summary:
      "The definitive Sinnoh journey. Enter the Distortion World and face the powerful Giratina.",
    starters: [387, 390, 393],
    legendaries: [480, 481, 482, 483, 484, 485, 486, 487, 488, 491],
    releaseDate: { jpn: "2008-09-13", int: "2009-03-22" },
    platform: "Nintendo DS",
  },
  heartgold: {
    summary:
      "A beloved remake of Pokémon Gold. Journey with your Pokémon following behind you in the Johto and Kanto regions.",
    starters: [152, 155, 158],
    legendaries: [
      243, 244, 245, 249, 250, 144, 145, 146, 150, 380, 381, 382, 383, 384,
    ],
    releaseDate: { jpn: "2009-09-12", int: "2010-03-14" },
    platform: "Nintendo DS",
  },
  soulsilver: {
    summary:
      "The definitive way to experience Johto. This remake features updated graphics, touch controls, and the Pokéwalker.",
    starters: [152, 155, 158],
    legendaries: [
      243, 244, 245, 249, 250, 144, 145, 146, 150, 380, 381, 382, 383, 384,
    ],
    releaseDate: { jpn: "2009-09-12", int: "2010-03-14" },
    platform: "Nintendo DS",
  },

  // Gen 5
  black: {
    summary:
      "Explore the Unova region, encounter Team Plasma, and discover the truth with Reshiram.",
    starters: [495, 498, 501],
    legendaries: [494, 638, 639, 640, 641, 642, 643, 646],
    releaseDate: { jpn: "2010-09-18", int: "2011-03-06" },
    platform: "Nintendo DS",
  },
  white: {
    summary:
      "Venture into modern Unova, battle N, and find the ideal world with Zekrom.",
    starters: [495, 498, 501],
    legendaries: [494, 638, 639, 640, 641, 642, 644, 646],
    releaseDate: { jpn: "2010-09-18", int: "2011-03-06" },
    platform: "Nintendo DS",
  },
  "black-2": {
    summary:
      "Return to Unova two years later. New areas, new Pokémon, and a new conflict with Team Plasma.",
    starters: [495, 498, 501],
    legendaries: [
      638, 639, 640, 641, 642, 643, 644, 646, 480, 481, 482, 485, 488, 377, 378,
      379, 380, 381,
    ],
    releaseDate: { jpn: "2012-06-23", int: "2012-10-07" },
    platform: "Nintendo DS",
  },
  "white-2": {
    summary:
      "A direct sequel to Pokémon White. Experience a brand new story and complete the expanded Unova Pokédex.",
    starters: [495, 498, 501],
    legendaries: [
      638, 639, 640, 641, 642, 643, 644, 646, 480, 481, 482, 485, 488, 377, 378,
      379, 380, 381,
    ],
    releaseDate: { jpn: "2012-06-23", int: "2012-10-07" },
    platform: "Nintendo DS",
  },

  // Gen 6
  x: {
    summary:
      "Enter the Kalos region and discover Mega Evolution in the first 3D Pokémon adventure on 3DS.",
    starters: [650, 653, 656],
    legendaries: [716, 717, 718, 144, 145, 146, 150],
    releaseDate: { jpn: "2013-10-12", int: "2013-10-12" },
    platform: "Nintendo 3DS",
  },
  y: {
    summary:
      "Explore the beauty of Kalos, customize your trainer, and unleash the power of Mega Evolution.",
    starters: [650, 653, 656],
    legendaries: [716, 717, 718, 144, 145, 146, 150],
    releaseDate: { jpn: "2013-10-12", int: "2013-10-12" },
    platform: "Nintendo 3DS",
  },
  "omega-ruby": {
    summary:
      "A spectacular reimagining of Pokémon Ruby. Discover Primal Reversion and soar through the skies of Hoenn.",
    starters: [252, 255, 258],
    legendaries: [
      383, 380, 381, 384, 382, 377, 378, 379, 483, 484, 487, 643, 644, 646, 641,
      642, 645,
    ],
    releaseDate: { jpn: "2014-11-21", int: "2014-11-21" },
    platform: "Nintendo 3DS",
  },
  "alpha-sapphire": {
    summary:
      "Return to Hoenn in this epic remake. Master Primal Reversion and protect the world from a meteor threat.",
    starters: [252, 255, 258],
    legendaries: [
      382, 380, 381, 384, 383, 377, 378, 379, 483, 484, 487, 643, 644, 646, 641,
      642, 645,
    ],
    releaseDate: { jpn: "2014-11-21", int: "2014-11-21" },
    platform: "Nintendo 3DS",
  },

  // Gen 7
  sun: {
    summary:
      "Experience the Alola region and master Z-Moves in this unique island trial adventure.",
    starters: [722, 725, 728],
    legendaries: [785, 786, 787, 788, 789, 790, 791, 792, 800],
    releaseDate: { jpn: "2016-11-18", int: "2016-11-18" },
    platform: "Nintendo 3DS",
  },
  moon: {
    summary:
      "Explore Alola's tropical islands, discover regional forms, and harness the power of the moon.",
    starters: [722, 725, 728],
    legendaries: [785, 786, 787, 788, 789, 790, 791, 792, 800],
    releaseDate: { jpn: "2016-11-18", int: "2016-11-18" },
    platform: "Nintendo 3DS",
  },
  "ultra-sun": {
    summary:
      "A massive upgrade to the Alola journey. Encounter Ultra Beasts and face the mysterious Necrozma.",
    starters: [722, 725, 728],
    legendaries: [
      800, 791, 792, 785, 786, 787, 788, 144, 145, 146, 150, 243, 244, 245, 249,
      250,
    ],
    releaseDate: { jpn: "2017-11-17", int: "2017-11-17" },
    platform: "Nintendo 3DS",
  },
  "ultra-moon": {
    summary:
      "The definitive Alola experience. Travel through Ultra Wormholes and explore the world beyond.",
    starters: [722, 725, 728],
    legendaries: [
      800, 791, 792, 785, 786, 787, 788, 144, 145, 146, 150, 243, 244, 245, 249,
      250,
    ],
    releaseDate: { jpn: "2017-11-17", int: "2017-11-17" },
    platform: "Nintendo 3DS",
  },
  "lets-go-pikachu": {
    summary:
      "A vibrant return to Kanto based on Pokémon Yellow. Use Poké Ball Plus controls and play with a friend.",
    starters: [25],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "2018-11-16", int: "2018-11-16" },
    platform: "Nintendo Switch",
  },
  "lets-go-eevee": {
    summary:
      "Explore Kanto with your partner Eevee. Experience a simplified catch mechanic inspired by Pokémon GO.",
    starters: [133],
    legendaries: [144, 145, 146, 150],
    releaseDate: { jpn: "2018-11-16", int: "2018-11-16" },
    platform: "Nintendo Switch",
  },

  // Gen 8
  sword: {
    summary:
      "Journey through the Galar region, experience Dynamax battles, and explore the vast Wild Area.",
    starters: [810, 813, 816],
    legendaries: [888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898],
    releaseDate: { jpn: "2019-11-15", int: "2019-11-15" },
    platform: "Nintendo Switch",
  },
  shield: {
    summary:
      "Become the champion of Galar, master the Max Raid Battles, and discover the legend of Zamazenta.",
    starters: [810, 813, 816],
    legendaries: [888, 889, 890, 891, 892, 893, 894, 895, 896, 897, 898],
    releaseDate: { jpn: "2019-11-15", int: "2019-11-15" },
    platform: "Nintendo Switch",
  },
  "the-isle-of-armor": {
    summary:
      "Travel to the Isle of Armor, train at the Master Dojo, and evolve Kubfu.",
    starters: [891],
    legendaries: [892],
    releaseDate: { jpn: "2020-06-17", int: "2020-06-17" },
    platform: "Nintendo Switch (DLC)",
  },
  "the-crown-tundra": {
    summary:
      "Explore the frozen Crown Tundra, lead an expedition, and discover the legendary Calyrex.",
    starters: [],
    legendaries: [898, 896, 897, 894, 895, 144, 145, 146],
    releaseDate: { jpn: "2020-10-22", int: "2020-10-22" },
    platform: "Nintendo Switch (DLC)",
  },
  "brilliant-diamond": {
    summary:
      "A faithful remake of the Sinnoh classic. Explore the Grand Underground and customize your Pokémon's Poké Balls.",
    starters: [387, 390, 393],
    legendaries: [483, 480, 481, 482, 485, 486, 488],
    releaseDate: { jpn: "2021-11-19", int: "2021-11-19" },
    platform: "Nintendo Switch",
  },
  "shining-pearl": {
    summary:
      "Experience the Sinnoh story again with updated graphics. Visit the Super Contest Shows and find Palkia.",
    starters: [387, 390, 393],
    legendaries: [484, 480, 481, 482, 485, 486, 488],
    releaseDate: { jpn: "2021-11-19", int: "2021-11-19" },
    platform: "Nintendo Switch",
  },
  "legends-arceus": {
    summary:
      "Travel to the Hisui region of the past. A bold new direction for the series featuring open-world exploration and action.",
    starters: [722, 155, 501],
    legendaries: [493, 483, 484, 487, 480, 481, 482, 485, 486, 488, 905],
    releaseDate: { jpn: "2022-01-28", int: "2022-01-28" },
    platform: "Nintendo Switch",
  },

  // Gen 9
  scarlet: {
    summary:
      "The first fully open-world Pokémon RPG. Explore the Paldea region at your own pace and attend the Naranja Academy.",
    starters: [906, 909, 912],
    legendaries: [1007, 1001, 1002, 1003, 1004, 1011, 1017],
    releaseDate: { jpn: "2022-11-18", int: "2022-11-18" },
    platform: "Nintendo Switch",
  },
  violet: {
    summary:
      "Embark on a treasure hunt in Paldea. Join the Uva Academy, ride Miraidon, and discover the mysteries of Area Zero.",
    starters: [906, 909, 912],
    legendaries: [1008, 1001, 1002, 1003, 1004, 1011, 1017],
    releaseDate: { jpn: "2022-11-18", int: "2022-11-18" },
    platform: "Nintendo Switch",
  },
  "the-teal-mask": {
    summary:
      "Visit the land of Kitakami on a school trip and unravel the local folktale.",
    starters: [],
    legendaries: [1017, 1014, 1015, 1016],
    releaseDate: { jpn: "2023-09-13", int: "2023-09-13" },
    platform: "Nintendo Switch (DLC)",
  },
  "the-indigo-disk": {
    summary:
      "Study at the Blueberry Academy, battle in the Terarium, and face the Terapagos.",
    starters: [],
    legendaries: [1024],
    releaseDate: { jpn: "2023-12-14", int: "2023-12-14" },
    platform: "Nintendo Switch (DLC)",
  },
  "legends-za": {
    summary:
      "A new adventure set entirely within Lumiose City in the Kalos region. Making use of an urban redevelopment plan to bring a vision of harmonious coexistence between people and Pokémon to life.",
    starters: [],
    legendaries: [],
    releaseDate: { jpn: "2025", int: "2025" },
    platform: "Nintendo Switch",
  },
  "mega-dimension": {
    summary:
      "Dive into a new dimension in this expansion for Pokémon Legends: Z-A.",
    starters: [],
    legendaries: [],
    releaseDate: { jpn: "2025", int: "2025" },
    platform: "Nintendo Switch (DLC)",
  },
  colosseum: {
    summary:
      "A unique adventure in the Orre region. Use Snag Balls to rescue Shadow Pokémon and purify their hearts.",
    starters: [196, 197],
    legendaries: [243, 244, 245, 249, 250],
    releaseDate: { jpn: "2003-11-21", int: "2004-03-22" },
    platform: "GameCube",
  },
  xd: {
    summary:
      "Return to Orre to stop Team Cipher once again. Snag and purify even more Shadow Pokémon, including the powerful Shadow Lugia.",
    starters: [133],
    legendaries: [249, 144, 145, 146, 243, 244, 245, 377, 378, 379],
    releaseDate: { jpn: "2005-08-04", int: "2005-10-03" },
    platform: "GameCube",
  },
  champions: {
    summary:
      "A special digital release.",
    starters: [],
    legendaries: [],
    releaseDate: { jpn: "2026", int: "2026" },
    platform: "Nintendo Switch (eShop)",
  },
};
