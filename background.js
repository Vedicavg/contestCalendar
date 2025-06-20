chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'login') {
    const clientId = '1069545777564-tp7lt91s8iovh1e54d8hm60q5u6j8d5o.apps.googleusercontent.com';
    const redirectUri = `https://${chrome.runtime.id}.chromiumapp.org/`;
    const scope = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
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
    }, async (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        console.error('Error during authentication:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError?.message || 'No redirect URL' });
        return;
      }

      const tokenMatch = redirectUrl.match(/access_token=([^&]*)/);
      if (!tokenMatch || !tokenMatch[1]) {
        console.error('Access token not found in redirect URL:', redirectUrl);
        sendResponse({ success: false, error: 'Access token missing' });
        return;
      }

      const token = tokenMatch[1];
      console.log('Access token received:', token);

      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!userInfoRes.ok) {
          throw new Error('Failed to fetch user info');
        }

        const userInfo = await userInfoRes.json();
        const userEmail = userInfo.email || 'Unknown';
        console.log('User info received:', userInfo);
        chrome.storage.local.set({
          access_token: token,
          user_email: userEmail,
          user_name: userInfo.name || 'User'
        }, () => {
          sendResponse({ success: true, token, email: userEmail, name: userInfo.name || 'User' });
        });
      } catch (err) {
        console.error('Error fetching user info:', err);
        sendResponse({ success: false, error: err.message });
      }
    });

    return true; // Keep the message channel open
  }
});
