import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface AdLocationMapProps {
  locationText: string;
  coords: { lat: number; lng: number };
}

export const AdLocationMap: React.FC<AdLocationMapProps> = ({ locationText, coords }) => {
  return (
    <Card className="rounded-2xl border-[#E5EAED] shadow-xs overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base sm:text-lg font-bold text-[#002f34] flex items-center gap-2">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 shrink-0" />
            <span>Location</span>
          </h2>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-teal-800 hover:text-teal-900 inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Open in Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 text-xs sm:text-sm">
          <p className="text-gray-800 font-bold flex items-center gap-1.5 truncate max-w-[240px]">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="truncate">{locationText}</span>
          </p>
          <span className="text-[11px] text-gray-400 font-mono">
            {coords.lat.toFixed(3)}°, {coords.lng.toFixed(3)}°
          </span>
        </div>

        {/* Real Live Map Embed with Pin Marker */}
        <div className="relative w-full h-[190px] sm:h-[220px] rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shadow-inner">
          <iframe
            title="Seller Location Map"
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="no"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.04}%2C${coords.lat - 0.03}%2C${coords.lng + 0.04}%2C${coords.lat + 0.03}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`}
            className="absolute inset-0 w-full h-full border-0"
          />
        </div>

        <div className="flex items-center justify-between pt-0.5 text-xs">
          <span className="text-gray-500 text-[11px] line-clamp-1">
            Approximate locality of seller
          </span>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-teal-800 hover:underline shrink-0"
          >
            Directions →
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
