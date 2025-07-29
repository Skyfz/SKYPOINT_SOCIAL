"use client";

import { useState, useEffect } from 'react';

export default function LastUpdatedTimestamp() {
  const [mounted, setMounted] = useState(false);
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    setMounted(true);
    setTimestamp(new Date().toLocaleString());
    
    // Update the timestamp every second to keep it current
    const interval = setInterval(() => {
      setTimestamp(new Date().toLocaleString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Only render the timestamp after the component has mounted to avoid hydration errors
  if (!mounted) {
    return <p className="mt-1">Last updated: Loading...</p>;
  }

  return <p className="mt-1">Last updated: {timestamp}</p>;
}
