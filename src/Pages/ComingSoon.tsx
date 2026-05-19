import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Clock className="w-24 h-24 text-yellow-500 mx-auto animate-pulse" />
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Coming Soon</h1>

        <p className="text-zinc-400 text-lg mb-8">
          We're working on exciting new features for you. Stay tuned!
        </p>

        <div className="space-y-4 mb-12">
          <p className="text-sm text-zinc-500">
            New movies, personalized recommendations, and more are on the way.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
};

export default ComingSoon;
