/**
 * game_storage.js - Client-side persistence for HTML games.
 * Manages anonymous users (no PII, no password) and multi-game progress in localStorage.
 * Includes 1-click JSON export/download and import functions.
 */

const GameStorage = {
  USERS_KEY: 'game_users_list',
  CURRENT_USER_KEY: 'game_active_user_id',
  STATE_KEY: 'game_state_records',

  /**
   * Initializes or gets the current anonymous user ID.
   * If none exists, generates an 8-character anonymous ID (e.g., usr_a1b2c3d4).
   */
  getOrCreateUserId() {
    let currentId = localStorage.getItem(this.CURRENT_USER_KEY);
    if (!currentId) {
      currentId = 'usr_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(this.CURRENT_USER_KEY, currentId);

      // Save to users directory
      const users = this.getAllUsers();
      users.push({
        user_id: currentId,
        created_at: new Date().toISOString(),
        status: 'active'
      });
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }
    return currentId;
  },

  /**
   * Returns list of all anonymous users registered on this browser.
   */
  getAllUsers() {
    const raw = localStorage.getItem(this.USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  /**
   * Saves or updates a user's progress for a specific game.
   * @param {string} gameId - e.g. 'duitquest_arcade' or 'duitsmart15'
   * @param {object} stats - { level, score, money, energy, ...custom }
   * @param {string} [userId] - optional, defaults to active user
   */
  saveProgress(gameId, stats, userId = null) {
    const uid = userId || this.getOrCreateUserId();
    const rawState = localStorage.getItem(this.STATE_KEY);
    const allStates = rawState ? JSON.parse(rawState) : {};

    if (!allStates[uid]) {
      allStates[uid] = {};
    }

    allStates[uid][gameId] = {
      level: stats.level || 1,
      score: stats.score || 0,
      money: stats.money !== undefined ? stats.money : 500,
      energy: stats.energy !== undefined ? stats.energy : 100,
      updated_at: new Date().toISOString(),
      ...(stats.custom || {})
    };

    localStorage.setItem(this.STATE_KEY, JSON.stringify(allStates));
    return allStates[uid][gameId];
  },

  /**
   * Loads saved progress for a given game.
   * @param {string} gameId
   * @param {string} [userId] - optional, defaults to active user
   */
  loadProgress(gameId, userId = null) {
    const uid = userId || this.getOrCreateUserId();
    const rawState = localStorage.getItem(this.STATE_KEY);
    const allStates = rawState ? JSON.parse(rawState) : {};
    return (allStates[uid] && allStates[uid][gameId]) || null;
  },

  /**
   * Exports users.json as a direct browser download.
   */
  downloadUsersFile() {
    const users = this.getAllUsers();
    this._triggerDownload('users.json', JSON.stringify(users, null, 2));
  },

  /**
   * Exports game_state.json as a direct browser download.
   */
  downloadGameStateFile() {
    const raw = localStorage.getItem(this.STATE_KEY);
    const states = raw ? JSON.parse(raw) : {};
    this._triggerDownload('game_state.json', JSON.stringify(states, null, 2));
  },

  /**
   * Imports external users.json or game_state.json from user file input.
   */
  importFile(file, isUsersFile = false, callback = null) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (isUsersFile) {
          localStorage.setItem(this.USERS_KEY, JSON.stringify(data));
        } else {
          localStorage.setItem(this.STATE_KEY, JSON.stringify(data));
        }
        if (callback) callback(true);
      } catch (err) {
        console.error('Failed to parse JSON file:', err);
        if (callback) callback(false);
      }
    };
    reader.readAsText(file);
  },

  _triggerDownload(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

// Auto-initialize anonymous identity on load
if (typeof window !== 'undefined') {
  window.GameStorage = GameStorage;
}
