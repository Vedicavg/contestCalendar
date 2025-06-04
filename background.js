chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'login') {
    const clientId = '1069545777564-tp7lt91s8iovh1e54d8hm60q5u6j8d5o.apps.googleusercontent.com';
    const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
    const scope = 'https://www.googleapis.com/auth/calendar.events';
    const state = Math.random().toString(36).substring(2);

    const authUrl = `https://accounts.google.com/o/oauth2/auth` +
      `?client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&prompt=consent` +
      `&state=${state}`;

    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        console.error('Error during authentication:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'No redirect URL' });
        return;
      }

      try {
        const tokenMatch = redirectUrl.match(/access_token=([^&]*)/);
        if (tokenMatch && tokenMatch[1]) {
          const token = tokenMatch[1];
          console.log('Access token received:', token);
          sendResponse({ success: true, token });
        } else {
          console.error('Access token not found in redirect URL:', redirectUrl);
          sendResponse({ success: false, error: 'Access token missing' });
        }
      } catch (err) {
        console.error('Error extracting token:', err);
        sendResponse({ success: false, error: err.message });
      }
    });

    return true;
  }
});
