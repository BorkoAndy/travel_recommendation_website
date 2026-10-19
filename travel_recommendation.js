const API_URL = 'travel_recommendation_api.json';

const searchInput = document.getElementById('searchInput');
const btnSearch = document.getElementById('btnSearch');
const btnClear = document.getElementById('btnClear');
const resultsBox = document.getElementById('results');
const hero = document.getElementById('home');

// Accepted keyword variations (the input is lower-cased before comparing,
// so "Beach", "BEACH", "beaches" and "BeAcHeS" all work)
const BEACH_KEYWORDS = ['beach', 'beaches'];
const TEMPLE_KEYWORDS = ['temple', 'temples'];
const COUNTRY_KEYWORDS = ['country', 'countries'];

// Time zones for the optional local-time feature, keyed by place name.
// (The JSON has no timeZone field, so they live here; a "timeZone" value
// in the JSON would take priority if you add one later.)
const TIME_ZONES = {
    'Sydney, Australia': 'Australia/Sydney',
    'Melbourne, Australia': 'Australia/Melbourne',
    'Tokyo, Japan': 'Asia/Tokyo',
    'Kyoto, Japan': 'Asia/Tokyo',
    'Rio de Janeiro, Brazil': 'America/Sao_Paulo',
    'São Paulo, Brazil': 'America/Sao_Paulo',
    'Angkor Wat, Cambodia': 'Asia/Phnom_Penh',
    'Taj Mahal, India': 'Asia/Kolkata',
    'Bora Bora, French Polynesia': 'Pacific/Tahiti',
    'Copacabana Beach, Brazil': 'America/Sao_Paulo'
};

// Lower-case and strip accents so "sao paulo" matches "São Paulo"
function normalize(text) {
    return text
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

let travelData = null;

// Fetch the data once when the page loads
fetch(API_URL)
    .then(response => {
        if (!response.ok) {
            throw new Error('HTTP error ' + response.status);
        }
        return response.json();
    })
    .then(data => {
        travelData = data;
        console.log(data); // check that the data can be accessed
    })
    .catch(error => {
        console.error('Could not load travel data:', error);
    });

// Every city of every country as one flat list
function allCities(data) {
    return data.countries.flatMap(country => country.cities);
}

// Return the recommendations that match what the user typed
function getRecommendations(keyword) {
    const term = normalize(keyword);
    if (!term || !travelData) {
        return [];
    }

    if (BEACH_KEYWORDS.includes(term)) {
        return travelData.beaches;
    }

    if (TEMPLE_KEYWORDS.includes(term)) {
        return travelData.temples;
    }

    if (COUNTRY_KEYWORDS.includes(term)) {
        return allCities(travelData);
    }

    // A specific country name, e.g. "japan" -> its cities
    const country = travelData.countries.find(c => normalize(c.name) === term);
    if (country) {
        return country.cities;
    }

    // Otherwise match part of a place name, e.g. "kyoto" or "taj"
    if (term.length >= 3) {
        const everything = [
            ...allCities(travelData),
            ...travelData.temples,
            ...travelData.beaches
        ];
        return everything.filter(place => normalize(place.name).includes(term));
    }

    return [];
}

function showResults(places, keyword) {
    resultsBox.innerHTML = '';

    if (places.length === 0) {
        const msg = document.createElement('p');
        msg.className = 'no-results';
        msg.textContent = 'No recommendations found for "' + keyword + '". ' +
            'Try "beach", "temple", "country" or a country name.';
        resultsBox.appendChild(msg);
    } else {
        places.forEach(place => {
            const card = document.createElement('article');
            card.className = 'result-card';

            const img = document.createElement('img');
            img.src = place.imageUrl;
            img.alt = place.name;

            const body = document.createElement('div');
            body.className = 'result-body';

            const title = document.createElement('h3');
            title.textContent = place.name;

            const desc = document.createElement('p');
            desc.textContent = place.description;

            body.appendChild(title);
            body.appendChild(desc);

            // Local time in the place's time zone (kept up to date below)
            const timeZone = place.timeZone || TIME_ZONES[place.name];
            if (timeZone) {
                const time = document.createElement('p');
                time.className = 'local-time';
                time.dataset.timezone = timeZone;
                time.textContent = 'Local time: ' + getLocalTime(timeZone);
                body.appendChild(time);
            }
            card.appendChild(img);
            card.appendChild(body);
            resultsBox.appendChild(card);
        });
    }

    resultsBox.hidden = false;
    hero.classList.add('has-results');
}

// Clear button: remove the results and empty the search box
function clearResults() {
    resultsBox.innerHTML = '';
    resultsBox.hidden = true;
    hero.classList.remove('has-results');
    searchInput.value = '';
}

// Results are shown only after the user clicks Search
btnSearch.addEventListener('click', () => {
    const keyword = searchInput.value;
    if (!keyword.trim()) {
        clearResults();
        return;
    }
    showResults(getRecommendations(keyword), keyword.trim());
});

btnClear.addEventListener('click', clearResults);

// ----- Optional: current time in each recommended place -----
function getLocalTime(timeZone) {
    const options = {
        timeZone: timeZone,
        hour12: true,
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric'
    };
    return new Date().toLocaleTimeString('en-US', options);
}

// Refresh every displayed clock once per second
setInterval(() => {
    document.querySelectorAll('.local-time').forEach(el => {
        el.textContent = 'Local time: ' + getLocalTime(el.dataset.timezone);
    });
}, 1000);