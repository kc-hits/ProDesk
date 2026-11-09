
const Producers = () => {
  const producers = [
    { id: 1, name: "Alex Morgan", genre: "Trap", beats: 24 },
    { id: 2, name: "John Smith", genre: "Drill", beats: 18 },
    { id: 3, name: "David Stone", genre: "Hip Hop", beats: 32 },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-4xl font-bold mb-3">Producers</h1>
      <p className="text-zinc-400 mb-10">Meet talented music producers.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {producers.map((producer) => (
          <div key={producer.id} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <div className="w-20 h-20 rounded-full bg-zinc-700 mb-5 flex items-center justify-center text-2xl">
              {producer.name.charAt(0)}
            </div>
            <h2 className="text-xl font-semibold">{producer.name}</h2>
            <p className="text-zinc-400 mt-2">{producer.genre}</p>
            <p className="mt-4 text-sm">{producer.beats} Beats</p>
          </div>
        ))}
      </div>
    </main>
  );
};

export default Producers;
