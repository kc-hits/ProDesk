
const Beats = () => {
  const beats = [
    { id: 1, title: "Dark Trap", producer: "Soheil", genre: "Trap", price: "$29" },
    { id: 2, title: "Midnight", producer: "Alex", genre: "Drill", price: "$39" },
    { id: 3, title: "Dreams", producer: "John", genre: "R&B", price: "$19" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-4xl font-bold mb-3">Beats</h1>
      <p className="text-zinc-400 mb-10">Discover your next sound.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {beats.map((beat) => (
          <div key={beat.id} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
            <div className="h-40 bg-zinc-800 rounded-lg mb-5 flex items-center justify-center">
              <span className="text-4xl">♫</span>
            </div>
            <h2 className="text-xl font-semibold">{beat.title}</h2>
            <p className="text-zinc-400 mt-2">{beat.producer} · {beat.genre}</p>
            <div className="flex justify-between items-center mt-5">
              <span>{beat.price}</span>
              <button className="bg-white text-black px-4 py-2 rounded-lg">
                Buy Beat
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
};

export default Beats;
