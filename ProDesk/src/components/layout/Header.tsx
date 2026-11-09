import { Link } from 'react-router-dom';
import { ShoppingCart, User, Music2 } from 'lucide-react';

function Header() {
  return (
    <header className="border-b border-white/10 bg-zinc-950">
      <div className="container mx-auto flex h-20 items-center justify-between px-6">

        <Link to="/" className="flex items-center gap-2">
          <Music2 size={28} className="text-purple-500" />
          <span className="text-xl font-bold text-white">ProDesk</span>
        </Link>

        <nav className="flex items-center gap-8 text-sm text-zinc-300">
          <Link to="/">خانه</Link>
          <Link to="/beats">بیت‌ها</Link>
          <Link to="/producers">پرودیوسرها</Link>
        </nav>

        <div className="flex items-center gap-5">
          <Link to="/cart">
            <ShoppingCart size={21} />
          </Link>

          <Link
            to="/login"
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white"
          >
            <User size={18} />
            ورود
          </Link>
        </div>

      </div>
    </header>
  );
}

export default Header;