// Script to clear localStorage and force re-initialization of insulationType
// Run this in browser console if issues persist

console.log('Clearing cable calculation localStorage...');

// Get all localStorage keys
const keys = Object.keys(localStorage);

// Filter for cable calculation related keys
const cableKeys = keys.filter(k =>
  k.includes('main-board-state') ||
  k.includes('service-tab-state') ||
  k.includes('groups-state')
);

console.log('Found keys:', cableKeys);

// Clear them
cableKeys.forEach(key => {
  console.log(`Clearing: ${key}`);
  localStorage.removeItem(key);
});

console.log('Done! Please refresh the page.');
