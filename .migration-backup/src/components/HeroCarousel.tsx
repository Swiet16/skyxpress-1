import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const carouselImages = [
  {
    url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1920&h=800&fit=crop&crop=center&auto=format',
    title: 'Global Air Cargo Network',
    description: 'Fast and reliable international shipping solutions'
  },
  {
    url: 'https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=1920&h=800&fit=crop&crop=center&auto=format',
    title: 'Express Delivery Solutions', 
    description: 'Door-to-door courier services worldwide'
  },
  {
    url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=800&fit=crop&crop=center&auto=format',
    title: 'Secure Package Handling',
    description: 'Your packages are safe with our expert team'
  },
  {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&h=800&fit=crop&crop=center&auto=format',
    title: 'Real-time Tracking',
    description: 'Monitor your shipments every step of the journey'
  },
  {
    url: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1920&h=800&fit=crop&crop=center&auto=format',
    title: 'International Commerce',
    description: 'Connecting businesses across continents seamlessly'
  }
];

export const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === carouselImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex(currentIndex === 0 ? carouselImages.length - 1 : currentIndex - 1);
  };

  const goToNext = () => {
    setCurrentIndex(currentIndex === carouselImages.length - 1 ? 0 : currentIndex + 1);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-lg shadow-2xl">
      {/* Images */}
      <div className="relative w-full h-full">
        {carouselImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
              index === currentIndex 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            }`}
          >
            <img
              src={image.url}
              alt={image.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute inset-0 flex flex-col justify-center items-start p-8 md:p-16 max-w-3xl">
              <h2 className={`text-4xl md:text-6xl font-bold text-white mb-4 transition-all duration-700 ${
                index === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                <span className="text-secondary">Sky</span>
                <span className="text-primary-foreground">Xpress</span>
              </h2>
              <h3 className={`text-2xl md:text-3xl font-semibold text-orange-300 mb-2 transition-all duration-700 delay-200 ${
                index === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                {image.title}
              </h3>
              <p className={`text-lg md:text-xl text-gray-200 mb-8 transition-all duration-700 delay-400 ${
                index === currentIndex ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
              }`}>
                {image.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="outline"
        size="icon"
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white hover:text-white z-10"
        onClick={goToPrevious}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
      
      <Button
        variant="outline"
        size="icon"
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white hover:text-white z-10"
        onClick={goToNext}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Slide Counter */}
      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 text-white text-sm z-10">
        {currentIndex + 1} / {carouselImages.length}
      </div>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-3 z-10">
        {carouselImages.map((_, index) => (
          <button
            key={index}
            className={`w-4 h-4 rounded-full transition-all duration-300 border-2 ${
              index === currentIndex 
                ? 'bg-secondary border-secondary scale-110' 
                : 'bg-white/30 border-white/50 hover:bg-white/50'
            }`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/30 z-10">
        <div 
          className="h-full bg-secondary transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / carouselImages.length) * 100}%` }}
        />
      </div>
    </div>
  );
};