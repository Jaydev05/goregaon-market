// Keyless Google Maps embed showing the delivery drop-off pin.
export function DeliveryMap({ lat, lng, className = "" }: { lat: number; lng: number; className?: string }) {
  const src = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  return (
    <div className={`overflow-hidden rounded-xl border bg-muted ${className}`}>
      <iframe title="Delivery location" src={src} className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
    </div>
  );
}
