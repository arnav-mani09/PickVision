import React from 'react';

const leagues = [
  {
    title: 'NBA',
    link: 'https://www.espn.com/nba/',
    image: 'https://upload.wikimedia.org/wikipedia/en/0/03/National_Basketball_Association_logo.svg',
    blurb: 'Standings, trades, and injury news as the season unfolds.',
  },
  {
    title: 'NFL',
    link: 'https://www.espn.com/nfl/',
    image: 'https://upload.wikimedia.org/wikipedia/en/a/a2/National_Football_League_logo.svg',
    blurb: 'Weekly matchups, injury reports, and the playoff race.',
  },
  {
    title: 'MLB',
    link: 'https://www.espn.com/mlb/',
    image: '/mlb.png',
    blurb: 'Pennant races, pitching matchups, and roster moves.',
  },
  {
    title: 'Soccer',
    link: 'https://www.espn.com/soccer/',
    image: '',
    blurb: 'International tournaments and league play worldwide.',
  },
];

export const NewsSection: React.FC = () => {
  return (
    <section className="px-6 py-16 md:py-20">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white">Sports News by League</h2>
        <p className="mt-3 text-gray-400">
          Browse recent updates across major sports. Each card links out to fresh coverage.
        </p>
        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {leagues.map((item) => (
            <a
              key={item.title}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative rounded-xl overflow-hidden border border-white/10 bg-black hover:border-purple-500/40 transition-colors"
            >
              <div className="relative h-40 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-black/40 via-black/70 to-black/90">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={`${item.title} logo`}
                    className="h-16 w-auto drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center text-2xl">
                    ⚽
                  </div>
                )}
                <span className="text-lg font-semibold text-white">{item.title}</span>
              </div>
              <div className="p-4 bg-black/90">
                <p className="text-xs text-gray-400">{item.blurb}</p>
                <p className="mt-2 text-xs text-purple-300 group-hover:text-purple-200">
                  Latest headlines →
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};
