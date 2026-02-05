import { useState, useEffect } from 'react';

export const useBattery = () => {
  const [level, setLevel] = useState<number>(1);
  const [charging, setCharging] = useState<boolean>(true);
  const [supported, setSupported] = useState<boolean>(false);

  useEffect(() => {
    // Check if Battery API is supported
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setSupported(true);
        setLevel(battery.level);
        setCharging(battery.charging);

        const updateLevel = () => setLevel(battery.level);
        const updateCharging = () => setCharging(battery.charging);

        battery.addEventListener('levelchange', updateLevel);
        battery.addEventListener('chargingchange', updateCharging);

        // Cleanup listeners
        // Note: removeEventListener might not work on the battery object in some older implementations
        // but acts as a best practice here.
        return () => {
             battery.removeEventListener('levelchange', updateLevel);
             battery.removeEventListener('chargingchange', updateCharging);
        };
      });
    }
  }, []);

  return { level, charging, supported };
};