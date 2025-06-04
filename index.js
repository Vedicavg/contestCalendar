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

const el = document.getElementById('contest-list');
const loginBtn = document.getElementById('login-btn');
const refreshButton = document.getElementById('refresh-btn');

function updateLoginButton() {
  chrome.storage.local.get('access_token', (data) => {
    loginBtn.textContent = data.access_token ? 'Logout' : 'Login using Google';
  });
}

async function getActiveContests() {
  const response = await fetch('https://codeforces.com/api/contest.list');
  const data = await response.json();
  const activeContests = data.result.filter(contest =>
    contest.phase === 'BEFORE' || contest.phase === 'CODING');

  if (activeContests.length === 0) {
    el.innerHTML = '<p>No active contests found.</p>';
    return;
  }

  const contests = activeContests.map(contest => ({
    id: contest.id,
    name: contest.name,
    startTime: new Date(contest.startTimeSeconds * 1000),
    startTimeFormatted: new Date(contest.startTimeSeconds * 1000).toLocaleString('en-IN', options),
    durationHours: contest.durationSeconds / 3600,
    type: contest.type
  }));

  el.innerHTML = '';
  contests.forEach(contest => {
    const contestElement = document.createElement('div');
    contestElement.className = 'contest';
    contestElement.innerHTML = `
      <h3>${contest.name}</h3>
      <p>Start Time: ${contest.startTimeFormatted}</p>
      <p>Duration: ${contest.durationHours} hours</p>
      <p>Type: ${contest.type}</p>
      <a href="https://codeforces.com/contest/${contest.id}" target="_blank">View Contest</a>
      <button class="add-to-calendar"
        data-id="${contest.id}"
        data-name="${contest.name}"
        data-start="${contest.startTime.toISOString()}"
        data-duration="${contest.durationHours}">
        Add to Calendar
      </button>
    `;
    el.appendChild(contestElement);
  });
}

async function eventAlreadyExists(contest, token) {
  const start = new Date(contest.start).toISOString();
  const end = new Date(new Date(contest.start).getTime() + contest.duration * 60 * 60 * 1000).toISOString();

  const queryUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&q=${encodeURIComponent(contest.name)}`;
  const response = await fetch(queryUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const data = await response.json();
  return data.items && data.items.some(event => event.summary === contest.name);
}

function addToCalendar(contest) {
  chrome.storage.local.get('access_token', async (data) => {
    const token = data.access_token;
    if (!token) {
      alert('Please login to add events to Google Calendar.');
      return;
    }

    const alreadyAdded = await eventAlreadyExists(contest, token);
    if (alreadyAdded) {
      alert('Event already exists in your calendar.');
      return;
    }

    const startTime = new Date(contest.start).toISOString();
    const endTime = new Date(new Date(contest.start).getTime() + parseFloat(contest.duration) * 60 * 60 * 1000).toISOString();

    const event = {
      summary: contest.name,
      description: `Codeforces contest: ${contest.name}`,
      start: {
        dateTime: startTime,
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Asia/Kolkata',
      }
    };

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });

      const result = await response.json();
      if (response.ok) {
        alert('Event added to your Google Calendar!');
      } else {
        console.error('Error creating event:', result);
        alert('Failed to add event.');
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
      duration: parseFloat(btn.dataset.duration),
    };

    addToCalendar(contest);
  }
});

loginBtn.addEventListener('click', () => {
  chrome.storage.local.get('access_token', (data) => {
    if (data.access_token) {
      chrome.storage.local.remove('access_token', () => {
        updateLoginButton();
        console.log('Logged out');
      });
    } else {
      chrome.runtime.sendMessage({ type: 'login' }, (response) => {
        if (response.success) {
          chrome.storage.local.set({ access_token: response.token }, () => {
            updateLoginButton();
            console.log('Access token saved');
          });
        } else {
          console.error('Login failed:', response.error);
        }
      });
    }
  });
});

refreshButton.onclick = () => {
  el.innerHTML = 'Loading ...';
  getActiveContests();
};

updateLoginButton();
getActiveContests();
