import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface GalleryImage {
  id: number;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

interface Props {
  eventId: number;
  eventTitle: string;
  onClose: () => void;
}

export default function EventPhotoGrid({
  eventId,
  eventTitle,
  onClose,
}: Props) {
  const [activeImageId, setActiveImageId] = useState<number | null>(null);

  const {
    data: gallery,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["eventGallery", eventId],
    queryFn: async () => {
      const response = await fetch(`/api/images/event/${eventId}/gallery`);
      if (!response.ok) throw new Error("Failed to load gallery");
      const json = await response.json();
      return json.data as GalleryImage[];
    },
  });

  const images = gallery ?? [];

  const activeIndex =
    activeImageId === null
      ? -1
      : images.findIndex((image) => image.id === activeImageId);

  const showPrevious = () => {
    if (images.length === 0 || activeIndex < 0) return;
    const previousIndex = (activeIndex - 1 + images.length) % images.length;
    setActiveImageId(images[previousIndex].id);
  };

  const showNext = () => {
    if (images.length === 0 || activeIndex < 0) return;
    const nextIndex = (activeIndex + 1) % images.length;
    setActiveImageId(images[nextIndex].id);
  };

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeImageId !== null) {
          setActiveImageId(null);
          return;
        }
        onClose();
      }

      if (activeImageId !== null && e.key === "ArrowLeft") {
        showPrevious();
      }

      if (activeImageId !== null && e.key === "ArrowRight") {
        showNext();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [activeImageId, onClose, activeIndex, images.length]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={() => {
        if (activeImageId !== null) {
          setActiveImageId(null);
          return;
        }
        onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-red-900 font-bold">
              Event Gallery
            </p>
            <h3 className="text-xl font-black text-stone-900">{eventTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold"
            aria-label="Close gallery"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-82px)]">
          {isLoading && (
            <div className="py-16 text-center">
              <div className="inline-block w-8 h-8 border-2 border-red-900/25 border-t-red-900 rounded-full animate-spin mb-3" />
              <p className="text-sm text-stone-500">Loading photos...</p>
            </div>
          )}

          {error && (
            <div className="py-14 text-center bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700 font-semibold">
                Failed to load event photos.
              </p>
            </div>
          )}

          {!isLoading && !error && (!gallery || gallery.length === 0) && (
            <div className="py-14 text-center bg-stone-50 border border-stone-200 rounded-xl">
              <p className="text-sm text-stone-600 font-semibold">
                No photos uploaded for this event yet.
              </p>
            </div>
          )}

          {!isLoading && !error && gallery && gallery.length > 0 && (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
              {gallery.map((image) => (
                <button
                  key={image.id}
                  onClick={() => setActiveImageId(image.id)}
                  className="mb-4 w-full break-inside-avoid overflow-hidden rounded-xl border border-stone-200 bg-stone-100 hover:border-red-300 hover:shadow-lg transition-all"
                >
                  <img
                    src={`/api/images/${image.id}/view`}
                    alt={image.fileName || `${eventTitle} photo`}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {activeImageId !== null && activeIndex >= 0 && (
        <div
          className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4"
          onClick={() => setActiveImageId(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveImageId(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-2xl leading-none"
            aria-label="Close expanded image"
          >
            ×
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showPrevious();
              }}
              className="absolute left-4 md:left-8 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl"
              aria-label="Previous image"
            >
              ‹
            </button>
          )}

          <img
            src={`/api/images/${activeImageId}/view`}
            alt={images[activeIndex].fileName || `${eventTitle} photo`}
            className="max-w-[95vw] max-h-[88vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
              className="absolute right-4 md:right-8 w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white text-xl"
              aria-label="Next image"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
