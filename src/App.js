import React, { Suspense } from "react";
import "./App.css";
import Navbar from "./components/Navbar.tsx";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./Pages/Home.tsx";
import MovieList from "./Pages/MovieList.tsx";
import Bookmarks from "./Pages/Bookmarks.jsx";
import Toprated from "./Pages/Toprated.jsx";
import Actordetails, {
  ActorAwardsPanel,
  ActorSimilarPanel,
  ActorSocialPanel,
} from "./Pages/Actordetails.tsx";
import Providers from "./components/Providers";
import WatchlistProvider from "./features/watchlist/WatchlistContext";
import ErrorBoundary from "./components/feedback/ErrorBoundary";
import { MovieDetailsSkeleton } from "./components/feedback/Skeletons";
import ThemeSurface from "./components/theme/ThemeSurface";

const MovieDetails = React.lazy(() => import("./Pages/MovieDetails.tsx"));

function AppRoutes() {
  const location = useLocation();

  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Suspense fallback={<MovieDetailsSkeleton />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<MovieList />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/watchlist" element={<Bookmarks />} />
          <Route path="/bookmarks" element={<Navigate to="/watchlist" replace />} />
          <Route path="/actor/:id" element={<Actordetails />}>
            <Route index element={<ActorAwardsPanel />} />
            <Route path="awards" element={<ActorAwardsPanel />} />
            <Route path="social" element={<ActorSocialPanel />} />
            <Route path="similar" element={<ActorSimilarPanel />} />
          </Route>
          <Route path="/top-rated" element={<Toprated />} />
          <Route path="/coming-soon" element={<Navigate to="/movies?sort=upcoming" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <Providers>
      <WatchlistProvider>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ThemeSurface>
            <Navbar />
            <AppRoutes />
          </ThemeSurface>
        </BrowserRouter>
      </WatchlistProvider>
    </Providers>
  );
}

export default App;
