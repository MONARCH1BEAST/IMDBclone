import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Play,
  X,
} from "lucide-react";
import React from "react";

const SWIPE_OFFSET = 80;
const SWIPE_VELOCITY = 400;

const TRUSTED_ARTWORK_HOSTNAMES = new Set(["image.tmdb.org", "images.unsplash.com"]);

export function isAllowedImageSource(src) {
  if (!src) {
    return false;
  }

  if (src.startsWith("/") || src.startsWith("data:")) {
    return true;
  }

  try {
    return TRUSTED_ARTWORK_HOSTNAMES.has(new URL(src).hostname);
  } catch (error) {
    return false;
  }
}

function youtubeId(url) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "") || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] || null;
      }
      return parsed.searchParams.get("v");
    }
  } catch (error) {
    return null;
  }

  return null;
}

function createSlides(movie) {
  const videoId = youtubeId(movie?.trailer);
  const imageSlides = [
    {
      id: "backdrop",
      title: "Backdrop",
      image: movie?.backdrop,
      description: "Wide artwork",
    },
    {
      id: "poster",
      title: "Poster",
      image: movie?.image,
      description: "Poster artwork",
    },
  ].filter((slide) => isAllowedImageSource(slide.image));

  const slides = videoId
    ? [
        {
          id: "trailer",
          title: "Trailer",
          description: "Open trailer",
          videoId,
        },
        ...imageSlides,
      ]
    : imageSlides;

  if (slides.length) {
    return slides;
  }

  return [
    {
      id: "placeholder-1",
      title: "Preview unavailable",
      description: "Static placeholder",
      placeholder: true,
    },
    {
      id: "placeholder-2",
      title: "Artwork unavailable",
      description: "Static placeholder",
      placeholder: true,
    },
  ];
}

function nextIndex(index, total) {
  return (index + 1) % total;
}

function previousIndex(index, total) {
  return (index - 1 + total) % total;
}

function prefetchImage(src) {
  if (!isAllowedImageSource(src) || typeof Image === "undefined") {
    return;
  }

  const img = new Image();
  img.decoding = "async";
  img.src = src;
}

function focusableElements(root) {
  return Array.from(
    root.querySelectorAll(
      'a[href], button:not([disabled]), iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  );
}

function TrailerModal({ videoId, title, onClose }) {
  const modalRef = React.useRef(null);
  const closeButtonRef = React.useRef(null);
  const previousFocus = React.useRef(null);

  React.useEffect(() => {
    previousFocus.current = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const items = focusableElements(modalRef.current);
      if (!items.length) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus.current?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} trailer`}
        className="w-full max-w-4xl rounded-lg border border-zinc-700 bg-zinc-950 p-4 shadow-2xl"
        initial={{ scale: 0.98 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.98 }}
      >
        <div className="flex justify-end mb-3">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 p-2 text-zinc-200 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            aria-label="Close trailer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video overflow-hidden rounded-lg bg-black">
          <iframe
            title={`${title} trailer`}
            src={`https://www.youtube.com/embed/${videoId}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function SlideArtwork({ slide, movieTitle }) {
  if (slide.videoId) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-center">
        <div className="mb-4 rounded-full bg-yellow-500 p-5 text-black shadow-xl shadow-yellow-500/20">
          <Play className="h-10 w-10 fill-current" />
        </div>
        <p className="text-sm uppercase tracking-wide text-yellow-400">
          {movieTitle}
        </p>
        <p className="mt-2 text-2xl font-bold">Watch trailer</p>
      </div>
    );
  }

  if (slide.image) {
    return (
      <img
        src={slide.image}
        alt={`${movieTitle} ${slide.title}`}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-zinc-300">
      <ImageIcon className="mb-3 h-10 w-10 text-zinc-500" />
      <p className="font-semibold">{slide.title}</p>
      <p className="text-sm text-zinc-500">{slide.description}</p>
    </div>
  );
}

function MovieMediaCarousel({ movie }) {
  const slides = React.useMemo(() => createSlides(movie), [movie]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isPaused, setIsPaused] = React.useState(false);
  const [modalVideoId, setModalVideoId] = React.useState(null);
  const slideRefs = React.useRef([]);

  const activeSlide = slides[activeIndex] || slides[0];
  const modalOpen = Boolean(modalVideoId);

  const goTo = React.useCallback(
    (index, focusSlide = false) => {
      const safeIndex = (index + slides.length) % slides.length;
      setActiveIndex(safeIndex);
      if (focusSlide) {
        window.requestAnimationFrame(() => slideRefs.current[safeIndex]?.focus());
      }
    },
    [slides.length]
  );

  const goNext = React.useCallback(
    (focusSlide = false) => goTo(nextIndex(activeIndex, slides.length), focusSlide),
    [activeIndex, goTo, slides.length]
  );

  const goPrevious = React.useCallback(
    (focusSlide = false) =>
      goTo(previousIndex(activeIndex, slides.length), focusSlide),
    [activeIndex, goTo, slides.length]
  );

  React.useEffect(() => {
    if (isPaused || modalOpen || slides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) => nextIndex(index, slides.length));
    }, 5000);

    return () => window.clearInterval(timer);
  }, [isPaused, modalOpen, slides.length]);

  React.useEffect(() => {
    const nextSlide = slides[nextIndex(activeIndex, slides.length)];
    prefetchImage(nextSlide?.image);
  }, [activeIndex, slides]);

  const handleHover = () => {
    const nextSlide = slides[nextIndex(activeIndex, slides.length)];
    prefetchImage(nextSlide?.image);
  };

  const openActiveSlide = () => {
    if (activeSlide?.videoId) {
      setModalVideoId(activeSlide.videoId);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext(true);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrevious(true);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0, true);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(slides.length - 1, true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openActiveSlide();
    }
  };

  return (
    <section
      className="mt-8"
      aria-label={`${movie.title} media`}
      aria-roledescription="carousel"
      onMouseEnter={handleHover}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsPaused(false);
        }
      }}
    >
      <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        <div className="aspect-video">
          <AnimatePresence initial={false} mode="wait">
            <motion.button
              key={activeSlide.id}
              type="button"
              aria-label={`${activeSlide.title}. ${activeSlide.description}`}
              className="relative h-full w-full overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-yellow-500"
              onClick={openActiveSlide}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.18}
              dragMomentum
              onDragEnd={(_, info) => {
                if (
                  info.offset.x < -SWIPE_OFFSET ||
                  info.velocity.x < -SWIPE_VELOCITY
                ) {
                  goNext();
                } else if (
                  info.offset.x > SWIPE_OFFSET ||
                  info.velocity.x > SWIPE_VELOCITY
                ) {
                  goPrevious();
                }
              }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <SlideArtwork slide={activeSlide} movieTitle={movie.title} />
            </motion.button>
          </AnimatePresence>
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goPrevious()}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Previous media slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => goNext()}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-label="Next media slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      <div
        className="mt-3 flex gap-2"
        role="group"
        aria-label="Media slides"
        onKeyDown={handleKeyDown}
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            ref={(node) => {
              slideRefs.current[index] = node;
            }}
            type="button"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-current={index === activeIndex}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => goTo(index)}
            onFocus={() => setActiveIndex(index)}
            className={`h-12 flex-1 rounded-lg border px-3 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 ${
              index === activeIndex
                ? "border-yellow-500 bg-yellow-500 text-black"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="flex items-center justify-center gap-2 truncate">
              {slide.videoId ? (
                <Film className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              {slide.title}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {modalVideoId && (
          <TrailerModal
            videoId={modalVideoId}
            title={movie.title}
            onClose={() => setModalVideoId(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

export default MovieMediaCarousel;
