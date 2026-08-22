/**
 * Affiliator Killer - Background Service Worker (Manifest V3)
 */

// Configure side panel to open on action button click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('SidePanel behavior error:', error));

// Listen to installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Affiliator Killer Extension Installed Successfully!');
  }
});

// Message router between Sidepanel and Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PING') {
    sendResponse({ status: 'PONG' });
  }
  return true;
});
