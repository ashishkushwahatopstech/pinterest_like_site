/**
 * Premium Features & Reward Ads Management System
 * Allows users to unlock PRO features (4K Ultra HD Download, Color Palette Extraction, Batch Downloader)
 * for FREE by watching a short reward ad!
 */

const REWARD_PASS_KEY = 'pingrid_reward_pass_expires';

export const isPremiumUnlocked = () => {
  // Check admin status
  if (window.appState?.isAdmin) return true;

  // Check 24-hour ad-unlocked pass
  const expires = localStorage.getItem(REWARD_PASS_KEY);
  if (expires) {
    const expireTime = parseInt(expires, 10);
    if (!isNaN(expireTime) && Date.now() < expireTime) {
      return true;
    }
  }
  return false;
};

export const unlockRewardPass = (hours = 24) => {
  const expireTime = Date.now() + hours * 60 * 60 * 1000;
  localStorage.setItem(REWARD_PASS_KEY, expireTime.toString());
};

export const getRewardPassRemainingTime = () => {
  const expires = localStorage.getItem(REWARD_PASS_KEY);
  if (!expires) return null;
  const expireTime = parseInt(expires, 10);
  const remainingMs = expireTime - Date.now();
  if (remainingMs <= 0) return null;

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

/**
 * Triggers the interactive Reward Ad Modal.
 * If already unlocked, immediately invokes callback.
 * Otherwise, displays the Ad modal, runs a 5-second reward video/banner ad sequence,
 * and grants a 24-hour free pass upon completion!
 */
export const requestPremiumFeature = (featureName, onUnlockedCallback) => {
  if (isPremiumUnlocked()) {
    onUnlockedCallback();
    return;
  }

  showRewardAdModal(featureName, () => {
    unlockRewardPass(24);
    onUnlockedCallback();
  });
};

/**
 * Renders and manages the interactive Reward Ad Modal
 */
export const showRewardAdModal = (featureTitle, onSuccess) => {
  // Remove existing modal if any
  const existing = document.getElementById('reward-ad-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'reward-ad-modal-overlay';
  overlay.className = 'modal-backdrop show animate-fade';
  overlay.style.zIndex = '9999';

  overlay.innerHTML = `
    <div class="modal-box glass text-center animate-slide-up" style="max-width: 480px; padding: 28px; position: relative; border-radius: var(--radius-lg); border: 1px solid rgba(255, 215, 0, 0.3); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
      <!-- Close Button -->
      <button id="reward-ad-close-btn" class="modal-close" style="position: absolute; right: 16px; top: 16px; cursor: pointer; color: var(--text-secondary);">
        <span class="material-icons-outlined">close</span>
      </button>

      <!-- PRO Header Badge -->
      <div style="display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%); color: #000; font-weight: 800; padding: 4px 14px; border-radius: var(--radius-full); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);">
        <span class="material-icons-outlined" style="font-size: 1rem;">workspace_premium</span>
        <span>PRO Feature</span>
      </div>

      <h2 style="font-size: 1.5rem; font-family: var(--font-heading); margin-bottom: 8px; color: var(--text-primary);">
        Unlock ${featureTitle}
      </h2>
      <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px; line-height: 1.5;">
        Watch a short 5-second sponsor ad to get <strong>24 Hours of Unlimited Free PRO Access</strong> for all premium tools!
      </p>

      <!-- Interactive Video Ad Container -->
      <div id="reward-ad-container" style="background: #090d16; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--border-color); position: relative; min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-bottom: 20px;">
        <!-- Initial Ad Player State -->
        <div id="ad-initial-state" style="padding: 24px; text-align: center; width: 100%;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--accent-gradient); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; box-shadow: 0 8px 24px rgba(255, 51, 102, 0.4);">
            <span class="material-icons-outlined" style="font-size: 2.2rem; color: #fff;">play_arrow</span>
          </div>
          <div style="font-weight: 700; color: #fff; font-size: 1rem; margin-bottom: 4px;">Sponsor Video Reward Ad</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 16px;">Powered by Google AdSense (pub-2458897753508445)</div>

          <button id="start-watch-ad-btn" class="btn btn-primary" style="width: 100%; padding: 12px 20px; font-weight: 700; background: linear-gradient(135deg, #ff3366 0%, #ff6633 100%); cursor: pointer;">
            <span class="material-icons-outlined">play_circle_filled</span>
            <span>Watch Ad to Unlock (5s)</span>
          </button>
        </div>

        <!-- Active Playing Ad State (Hidden by default) -->
        <div id="ad-playing-state" style="display: none; width: 100%; height: 100%; position: absolute; inset: 0; background: #000; flex-direction: column; justify-content: space-between; padding: 16px;">
          <!-- Ad Banner Simulation Frame -->
          <div style="display: flex; justify-content: space-between; align-items: center; z-index: 10;">
            <span style="font-size: 0.7rem; background: rgba(255,255,255,0.2); color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: 600;">SPONSOR AD</span>
            <div id="ad-timer-badge" style="font-size: 0.8rem; font-weight: 800; color: #ffd700; background: rgba(0,0,0,0.7); padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(255,215,0,0.5);">
              Ad ends in <span id="ad-countdown-seconds">5</span>s
            </div>
          </div>

          <!-- Video Graphic Visualizer -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; margin: auto 0;">
            <div class="ad-pulse-ring" style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid #ff3366; display: flex; align-items: center; justify-content: center; animation: pulse 1.2s infinite alternate;">
              <span class="material-icons-outlined" style="font-size: 2.5rem; color: #ff3366;">ondemand_video</span>
            </div>
            <div style="color: #fff; font-weight: 600; font-size: 0.9rem;">Supporting PinGrid Creators</div>
            <div style="color: #94a3b8; font-size: 0.75rem;">Unlocking Pro Pass...</div>
          </div>

          <!-- Progress Bar at bottom of ad -->
          <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; overflow: hidden;">
            <div id="ad-progress-fill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #ff3366, #ffd700); transition: width 0.1s linear;"></div>
          </div>
        </div>

        <!-- Success Completed State (Hidden by default) -->
        <div id="ad-success-state" style="display: none; padding: 24px; text-align: center; width: 100%; animation: fadeIn 0.3s ease;">
          <div style="width: 60px; height: 60px; border-radius: 50%; background: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.4);">
            <span class="material-icons-outlined" style="font-size: 2.5rem; color: #fff;">check_circle</span>
          </div>
          <h3 style="font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 6px;">24-Hour PRO Pass Unlocked! 🎉</h3>
          <p style="font-size: 0.85rem; color: #a1a1aa; margin-bottom: 16px;">You now have full access to all Ultra HD Downloads, Color Palettes, and PRO features!</p>
          <button id="reward-ad-continue-btn" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700; background: #10b981; border: none; cursor: pointer;">
            <span>Continue & Use Feature</span>
          </button>
        </div>
      </div>

      <!-- Footer Info -->
      <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 4px;">
        <span class="material-icons-outlined" style="font-size: 0.9rem; color: #ffd700;">verified</span>
        <span>Instant Access • No Credit Card Required</span>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('#reward-ad-close-btn');
  const startBtn = overlay.querySelector('#start-watch-ad-btn');
  const continueBtn = overlay.querySelector('#reward-ad-continue-btn');
  
  const initialState = overlay.querySelector('#ad-initial-state');
  const playingState = overlay.querySelector('#ad-playing-state');
  const successState = overlay.querySelector('#ad-success-state');
  
  const countdownEl = overlay.querySelector('#ad-countdown-seconds');
  const progressFill = overlay.querySelector('#ad-progress-fill');

  let timerInterval;

  const closeModal = () => {
    clearInterval(timerInterval);
    overlay.remove();
  };

  closeBtn.onclick = closeModal;

  startBtn.onclick = () => {
    initialState.style.display = 'none';
    playingState.style.display = 'flex';

    const TOTAL_TIME_MS = 5000;
    const STEP_MS = 100;
    let elapsed = 0;

    timerInterval = setInterval(() => {
      elapsed += STEP_MS;
      const progressPercent = Math.min(100, (elapsed / TOTAL_TIME_MS) * 100);
      const remainingSeconds = Math.ceil((TOTAL_TIME_MS - elapsed) / 1000);

      if (progressFill) progressFill.style.width = `${progressPercent}%`;
      if (countdownEl) countdownEl.textContent = Math.max(0, remainingSeconds);

      if (elapsed >= TOTAL_TIME_MS) {
        clearInterval(timerInterval);
        playingState.style.display = 'none';
        successState.style.display = 'block';
      }
    }, STEP_MS);
  };

  continueBtn.onclick = () => {
    closeModal();
    if (onSuccess) onSuccess();
  };
};
