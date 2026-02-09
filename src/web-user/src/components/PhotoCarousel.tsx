import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselImage {
  id: number;
  fileName: string | null;
  mimeType: string | null;
  createdAt: string;
}

export default function PhotoCarousel() {
  const [images, setImages] = useState<CarouselImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-rotation interval (in milliseconds)
  const AUTO_ROTATE_INTERVAL = 5000; // 5 seconds

  // Fetch images from API
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch("/api/public/images/image-carousel");
        const data = await response.json();

        if (data.success && data.data.length > 0) {
          setImages(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch carousel images:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const nextSlide = useCallback(() => {
    if (isTransitioning || images.length === 0) return;
    setIsTransitioning(true);
    setDirection("next");
    setCarouselIndex((prev) => (prev + 1) % images.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [images.length, isTransitioning]);

  const prevSlide = useCallback(() => {
    if (isTransitioning || images.length === 0) return;
    setIsTransitioning(true);
    setDirection("prev");
    setCarouselIndex((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [images.length, isTransitioning]);

  // Auto-rotation effect
  useEffect(() => {
    if (images.length <= 1) return; // Don't auto-rotate if 1 or fewer images

    const interval = setInterval(() => {
      nextSlide();
    }, AUTO_ROTATE_INTERVAL);

    return () => clearInterval(interval);
  }, [images.length, nextSlide]);

  const getVisibleImages = () => {
    if (images.length === 0) return [];

    // Responsive display count based on screen size
    // This will be handled by CSS grid instead
    const visible: CarouselImage[] = [];

    // Show all images up to 3, let CSS handle responsive visibility
    const maxDisplay = Math.min(3, images.length);

    for (let i = 0; i < maxDisplay; i++) {
      visible.push(images[(carouselIndex + i) % images.length]);
    }
    return visible;
  };

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection(index > carouselIndex ? "next" : "prev");
    setCarouselIndex(index);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="px-10 sm:px-12 md:px-14 lg:px-16 xl:px-20">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`bg-gray-200 rounded-2xl shadow-xl animate-pulse aspect-square min-h-[350px] sm:min-h-[450px] lg:min-h-[550px] ${
                  i >= 2 ? "hidden md:block" : ""
                } ${i >= 3 ? "hidden xl:block" : ""}`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show message if no images
  if (images.length === 0) {
    return (
      <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
        <div className="px-10 sm:px-12 md:px-14 lg:px-16 xl:px-20">
          <div className="bg-gradient-to-br from-red-100 to-yellow-100 rounded-2xl shadow-xl p-12 sm:p-16 md:p-20 text-center">
            <p className="text-gray-600 text-lg sm:text-xl md:text-2xl">
              No images available at the moment
            </p>
          </div>
        </div>
      </div>
    );
  }

  const visibleImages = getVisibleImages();

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      <div className="relative px-10 sm:px-12 md:px-14 lg:px-16 xl:px-20">
        {/* Carousel Container */}
        <div className="overflow-hidden relative rounded-2xl">
          <div
            className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8 lg:gap-10 transition-all duration-500 ease-in-out`}
            style={{
              transform: isTransitioning
                ? direction === "next"
                  ? "translateX(-1%)"
                  : "translateX(1%)"
                : "translateX(0)",
            }}
          >
            {visibleImages.map((image, idx) => (
              <div
                key={image.id}
                className={`bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden cursor-pointer transform hover:scale-[1.02] ${
                  idx >= 1 ? "hidden md:block" : ""
                } ${idx >= 2 ? "hidden xl:block" : ""}`}
              >
                <div className="w-full aspect-square min-h-[350px] sm:min-h-[450px] lg:min-h-[550px] relative bg-gray-100">
                  <img
                    src={`/api/public/images/${image.id}/view`}
                    alt={image.fileName || "Carousel image"}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Image overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4 sm:p-6">
                    {image.fileName && (
                      <p className="text-white text-sm sm:text-base font-medium truncate">
                        {image.fileName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Arrows - show if more images than can fit on smallest screen */}
        {images.length > 1 && (
          <>
            {/* Previous Arrow */}
            <button
              onClick={prevSlide}
              disabled={isTransitioning}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 disabled:cursor-not-allowed text-red-900 rounded-full p-3 sm:p-4 md:p-5 lg:p-6 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-110 active:scale-95"
              aria-label="Previous images"
            >
              <ChevronLeft
                className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
                strokeWidth={3}
              />
            </button>

            {/* Next Arrow */}
            <button
              onClick={nextSlide}
              disabled={isTransitioning}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 disabled:cursor-not-allowed text-red-900 rounded-full p-3 sm:p-4 md:p-5 lg:p-6 transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-110 active:scale-95"
              aria-label="Next images"
            >
              <ChevronRight
                className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8"
                strokeWidth={3}
              />
            </button>
          </>
        )}
      </div>

      {/* Dot Indicators - only show if more than 1 image */}
      {images.length > 1 && (
        <div className="flex justify-center gap-3 sm:gap-4 px-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              disabled={isTransitioning}
              className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 ${
                index === carouselIndex
                  ? "bg-red-900 scale-125"
                  : "bg-yellow-500 hover:bg-yellow-600 hover:scale-110"
              } disabled:cursor-not-allowed`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
