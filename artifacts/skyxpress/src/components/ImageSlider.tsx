import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroLogisticsImage from "@/assets/hero-logistics.jpg";

const slides = [
  {
    image:
      "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/pic1.png",
    title: "Global Air Cargo Network",
    subtitle: "Fast and reliable international shipping solutions",
  },
  {
    image:
      "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/pic2.png",
    title: "Express Delivery Solutions",
    subtitle: "Door-to-door courier services worldwide",
  },
  {
    image:
      "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/pic3.png",
    title: "Secure Package Handling",
    subtitle: "Your packages are safe with our expert team",
  },
  {
    image:
      "https://thunaolandjuvuhbsds.supabase.co/storage/v1/object/public/File/pic4.png",
    title: "Real-time Tracking",
    subtitle: "Monitor your shipments every step of the journey",
  },
  {
    image:
      "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/pic5.png",
    title: "International Commerce",
    subtitle: "Connecting businesses across continents seamlessly",
  },
  {
    image:
      "https://thunaolandjuvuhvbsds.supabase.co/storage/v1/object/public/File/pic6.png",
    title: "Reliable Global Logistics",
    subtitle: "Courier and cargo services built around your business",
  },
];

const ImageSlider = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
    

  // Auto-advance slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="relative w-full h-96 md:h-[500px] overflow-hidden rounded-lg shadow-lg">
      {/* Slides */}
      <div 
        className="flex transition-transform duration-500 ease-in-out h-full"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {slides.map((slide, index) => (
          <div key={index} className="w-full h-full flex-shrink-0 relative">
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 z-0 w-full h-full object-cover"
              onError={(event) => {
                const image = event.currentTarget;
                if (image.src !== heroLogisticsImage) {
                  image.src = heroLogisticsImage;
                }
              }}
            />
            <div className="absolute inset-0 z-10 bg-black/35 flex items-center justify-center">
              <div className="relative z-20 text-center text-white px-4">
                <h3 className="text-2xl md:text-4xl font-bold mb-2">{slide.title}</h3>
                <p className="text-lg md:text-xl opacity-90">{slide.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-200"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-all duration-200"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              index === currentSlide 
                ? 'bg-white' 
                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageSlider;

