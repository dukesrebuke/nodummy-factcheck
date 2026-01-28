export type Source = {
  title: string;
  publisher: string;
  year: string;
  url: string;
  category: "immigration" | "crime" | "tariffs" | "constitutional";
  tier: "A" | "B";
};

export const SOURCES: Source[] = [
  {
    title: "Immigration and Crime: Assessing the Evidence",
    publisher: "National Academies of Sciences",
    year: "2015",
    url: "https://nap.nationalacademies.org/",
    category: "immigration",
    tier: "A",
  },
  {
    title: "Immigrants and Crime",
    publisher: "Bureau of Justice Statistics",
    year: "2021",
    url: "https://bjs.ojp.gov/",
    category: "crime",
    tier: "B",
  },
  {
    title: "The Impact of Tariffs on the U.S. Economy",
    publisher: "Congressional Budget Office",
    year: "2020",
    url: "https://www.cbo.gov/",
    category: "tariffs",
    tier: "B",
  },
  {
    title: "Youngstown Sheet & Tube Co. v. Sawyer",
    publisher: "U.S. Supreme Court",
    year: "1952",
    url: "https://supreme.justia.com/cases/federal/us/343/579/",
    category: "constitutional",
    tier: "A",
  },
];
