const el = document.getElementById('contest-list');
const refreshButton = document.getElementById('refresh-btn');
const loginBtn = document.getElementById('login-btn');

const options = {
  timeZone: 'Asia/Kolkata',
  hour12: true,
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
};

function updateLoginButton() {
  chrome.storage.local.get(['access_token', 'user_email','user_name'], (data) => {
    console.log(data);
    const isLoggedIn = !!data.access_token;
    if (isLoggedIn) {
        loginBtn.innerHTML = 'Logout';
      } else {
        loginBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 262" width="18" height="18" style="vertical-align: middle; margin-right: 6px;">
            <path fill="#4285F4" d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
            <path fill="#34A853" d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
            <path fill="#FBBC05" d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"></path>
            <path fill="#EB4335" d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
          </svg>
          <span style="vertical-align: middle;">Login with Google</span>
        `;
    }
  });
}

function updateProfileName() {
  chrome.storage.local.get(['user_name','user_email'], (data) => {
    const profileName = document.getElementById('user-name');
    const profileEmail = document.getElementById('user-email');
    if (profileEmail) {
      profileEmail.textContent = data.user_email || '';
    }
    if (profileName) {
      profileName.textContent = `Hi! ${data.user_name || ''} `;
    }
  });
}

loginBtn.addEventListener('click', () => {
  chrome.storage.local.get('access_token', (data) => {
    if (data.access_token) {
      // Logout
      chrome.storage.local.remove(['access_token', 'user_name','user_email'], () => {
        updateLoginButton();
        updateProfileName();
        console.log('Logged out');
      });
    } else {
      // Login
      chrome.runtime.sendMessage({ type: 'login' }, (response) => {
        if (response.success) {
          chrome.storage.local.set({ access_token: response.token, user_email: response.email,user_name: response.name }, () => {
            updateLoginButton();
            updateProfileName();

          });
        } else {
          console.error('Login failed:', response.error);
        }
      });
    }
  });
});

async function getActiveContests() {
  const response = await fetch('https://codeforces.com/api/contest.list');
  const data = await response.json();
  const activeContests = data.result.filter(
    contest => contest.phase === 'BEFORE' || contest.phase === 'CODING'
  );

  if (activeContests.length === 0) {
    el.innerHTML = 'No active contests found.';
    return;
  }

  const contestReadyForm = activeContests.map(contest => ({
    id: contest.id,
    name: contest.name,
    startTime: new Date(contest.startTimeSeconds * 1000).toLocaleString('en-IN', options),
    duration: `${contest.durationSeconds / 3600} hours`,
    type: contest.type
  }));

  el.innerHTML = '';
  contestReadyForm.forEach(contest => {
    const contestElement = document.createElement('div');
    contestElement.className = 'contest';
    contestElement.innerHTML = `
      <h3>${contest.name}</h3>
      <p>Start Time: ${contest.startTime}</p>
      <p>Duration: ${contest.duration}</p>
      <p>Type: ${contest.type}</p>
      <a href="https://codeforces.com/contest/${contest.id}" target="_blank">View Contest</a>
      <button class="add-to-calendar" data-id="${contest.id}" data-name="${contest.name}" data-start="${contest.startTime}" data-duration="${contest.duration}">Add to Calendar</button>
    `;
    el.appendChild(contestElement);
  });
}

// function addToCalendar(contest) {
//   chrome.storage.local.get('access_token', async (data) => {
//     const token = data.access_token;
//     if (!token) {
//       console.error('User not logged in.');
//       return;
//     }

//     const startTime = new Date(contest.start).toISOString();
//     const endTime = new Date(new Date(contest.start).getTime() + parseFloat(contest.duration) * 3600000).toISOString();

//     const event = {
//       summary: contest.name,
//       description: `Codeforces contest: ${contest.name}`,
//       start: { dateTime: startTime, timeZone: 'Asia/Kolkata' },
//       end: { dateTime: endTime, timeZone: 'Asia/Kolkata' }
//     };

//     try {
//       const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`,
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(event)
//       });

//       const result = await response.json();
//       if (response.ok) {
//         alert('Event added to your Google Calendar!');
//         console.log('Event created:', result);
//       } else {
//         console.error('Error creating event:', result);
//         alert('Failed to add event. Check console for details.');
//       }
//     } catch (err) {
//       console.error('Fetch error:', err);
//     }
//   });
// }

function addToCalendar(contest) {
  chrome.storage.local.get('access_token', async (data) => {
    const token = data.access_token;
    if (!token) {
      console.error('User not logged in.');
      return;
    }

    const startTime = new Date(contest.start).toISOString();
    const endTime = new Date(new Date(contest.start).getTime() + parseFloat(contest.duration) * 3600000).toISOString();

    const event = {
      summary: contest.name,
      description: `Codeforces contest: ${contest.name}`,
      start: { dateTime: startTime, timeZone: 'Asia/Kolkata' },
      end: { dateTime: endTime, timeZone: 'Asia/Kolkata' }
    };

    try {
      // Step 1: Search for existing event with same summary
      const searchResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(contest.name)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const searchData = await searchResponse.json();

      const alreadyExists = searchData.items?.some(ev =>
        ev.summary === contest.name &&
        ev.description?.includes('Codeforces')
      );

      if (alreadyExists) {
        alert('Event already exists in your Google Calendar.');
        return;
      }

      // Step 2: If not exists, create event
      const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      const result = await createResponse.json();
      if (createResponse.ok) {
        alert('Event added to your Google Calendar!');
        console.log('Event created:', result);
      } else {
        console.error('Error creating event:', result);
        alert('Failed to add event. Try logging out and logging back in.');
      }

    } catch (err) {
      console.error('Fetch error:', err);
    }
  });
}


el.addEventListener('click', (e) => {
  if (e.target.classList.contains('add-to-calendar')) {
    const btn = e.target;
    const contest = {
      id: btn.dataset.id,
      name: btn.dataset.name,
      start: btn.dataset.start,
      duration: btn.dataset.duration,
    };
    addToCalendar(contest);
  }
});

refreshButton.onclick = () => {
  el.innerHTML = `
                  <div class="flex">
                    <div class="newtons-cradle">
                      <div class="newtons-cradle__dot"></div>
                      <div class="newtons-cradle__dot"></div>
                      <div class="newtons-cradle__dot"></div>
                      <div class="newtons-cradle__dot"></div>
                    </div>
                  </div>
                `;
  getActiveContests();
};

getActiveContests();
updateLoginButton();
updateProfileName();
