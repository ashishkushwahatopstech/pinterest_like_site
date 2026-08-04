// Modals Component - Contains Connect Storage Consent, Create Board, and Multi-file Upload Modals

export const renderModalsHtml = () => {
  return `
    <!-- Connect Google Drive Storage Consent Modal -->
    <div class="modal-backdrop" id="modal-connect-storage">
      <div class="modal-box glass text-center" style="max-width: 420px; text-align: center;">
        <span class="material-icons-outlined" style="font-size: 4rem; color: var(--accent-primary); margin-bottom: 16px;">cloud_queue</span>
        <h2 class="modal-title" style="margin-bottom: 12px; font-size: 1.6rem;">Connect Personal Storage</h2>
        <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin-bottom: 24px;">
          To upload and share images, PinGrid needs to connect to your personal <strong>Google Drive</strong>. 
          <br><br>
          We only request access to files created by this application (<code>drive.file</code> scope). We will never see your other files.
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="consent-connect-btn" class="btn btn-primary" style="width: 100%;">
            <span class="material-icons-outlined">cloud_circle</span>
            <span>Connect Google Drive</span>
          </button>
          <button id="consent-cancel-btn" class="btn btn-secondary" style="width: 100%;">
            <span>Not Now</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Board Modal -->
    <div class="modal-backdrop" id="modal-create-board">
      <div class="modal-box glass">
        <button class="modal-close" id="create-board-close" aria-label="Close modal">
          <span class="material-icons-outlined">close</span>
        </button>
        <h2 class="modal-title">Create New Board</h2>
        <form id="create-board-form">
          <div class="form-group">
            <label class="form-label" for="board-name-input">Board Name</label>
            <input type="text" id="board-name-input" class="form-control" placeholder="e.g. Travel, Inspiration, Architecture" required maxlength="50" autocomplete="off">
          </div>
          <div class="form-group toggle-switch-container" style="margin-bottom: 24px;">
            <div>
              <label class="form-label" style="margin-bottom: 0;">Public Board</label>
              <div class="toggle-label-desc">Make this collection visible to all site visitors.</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="board-public-input">
              <span class="slider"></span>
            </label>
          </div>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" id="create-board-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="create-board-submit-btn">Create Board</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Multi-file Upload Modal -->
    <div class="modal-backdrop" id="modal-upload">
      <div class="modal-box glass" style="max-width: 600px;">
        <button class="modal-close" id="upload-close" aria-label="Close modal">
          <span class="material-icons-outlined">close</span>
        </button>
        <h2 class="modal-title">Upload Images</h2>
        
        <form id="upload-form">
          <!-- Board Selector -->
          <div class="form-group">
            <label class="form-label" for="upload-board-select">Select Board</label>
            <div style="display: flex; gap: 12px;">
              <select id="upload-board-select" class="form-control" style="flex: 1; color: var(--text-primary); cursor: pointer;" required>
                <!-- Dynamically populated -->
              </select>
              <button type="button" class="btn btn-secondary" id="upload-new-board-btn" title="Create new board">
                <span class="material-icons-outlined">create_new_folder</span>
              </button>
            </div>
          </div>

          <!-- Dropzone -->
          <div class="upload-dropzone" id="upload-dropzone">
            <span class="material-icons-outlined">cloud_upload</span>
            <p style="font-weight: 500; margin-bottom: 6px;">Drag & drop images here</p>
            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 12px;">Supports PNG, JPG, JPEG, WEBP up to 10MB</p>
            <button type="button" class="btn btn-glass" id="browse-files-btn">Browse Files</button>
            <input type="file" id="file-input" multiple accept="image/*" style="display: none;">
          </div>

          <!-- File Upload List (Queue) -->
          <div id="upload-queue-container" style="max-height: 200px; overflow-y: auto; display: none; flex-direction: column; gap: 12px; margin-bottom: 20px; border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
            <!-- Dynamically populated -->
          </div>

          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" id="upload-cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary" id="upload-submit-btn" disabled>Upload to Google Drive</button>
          </div>
        </form>
      </div>
    </div>
  `;
};

// --- CONNECT STORAGE MODAL CONTROL ---
export const showConnectModal = (onConnect, onCancel) => {
  const modal = document.getElementById('modal-connect-storage');
  if (!modal) return;
  modal.classList.add('show');

  const connectBtn = document.getElementById('consent-connect-btn');
  const cancelBtn = document.getElementById('consent-cancel-btn');

  const cleanListeners = () => {
    connectBtn.replaceWith(connectBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  };

  document.getElementById('consent-connect-btn').addEventListener('click', () => {
    modal.classList.remove('show');
    cleanListeners();
    if (onConnect) onConnect();
  });

  document.getElementById('consent-cancel-btn').addEventListener('click', () => {
    modal.classList.remove('show');
    cleanListeners();
    if (onCancel) onCancel();
  });
};

// --- CREATE BOARD MODAL CONTROL ---
export const showCreateBoardModal = (onSubmit) => {
  const modal = document.getElementById('modal-create-board');
  const form = document.getElementById('create-board-form');
  const cancelBtn = document.getElementById('create-board-cancel');
  const closeBtn = document.getElementById('create-board-close');
  const nameInput = document.getElementById('board-name-input');
  const publicInput = document.getElementById('board-public-input');
  const submitBtn = document.getElementById('create-board-submit-btn');

  if (!modal || !form) return;

  nameInput.value = '';
  publicInput.checked = false;
  submitBtn.disabled = false;
  submitBtn.textContent = 'Create Board';
  
  modal.classList.add('show');
  nameInput.focus();

  const hideModal = () => {
    modal.classList.remove('show');
  };

  cancelBtn.onclick = hideModal;
  closeBtn.onclick = hideModal;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const isPublic = publicInput.checked;
    
    if (!name) return;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';
    
    try {
      await onSubmit(name, isPublic);
      hideModal();
    } catch (err) {
      alert("Failed to create board: " + err.message);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Board';
    }
  };
};

// --- UPLOAD MODAL CONTROL ---
export const showUploadModal = (boards, onUpload, onTriggerNewBoard) => {
  const modal = document.getElementById('modal-upload');
  const form = document.getElementById('upload-form');
  const closeBtn = document.getElementById('upload-close');
  const cancelBtn = document.getElementById('upload-cancel-btn');
  const select = document.getElementById('upload-board-select');
  const newBoardBtn = document.getElementById('upload-new-board-btn');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-files-btn');
  const dropzone = document.getElementById('upload-dropzone');
  const queueContainer = document.getElementById('upload-queue-container');
  const submitBtn = document.getElementById('upload-submit-btn');

  if (!modal) return;

  // Clear selections and queue
  let uploadQueue = [];
  queueContainer.innerHTML = '';
  queueContainer.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Upload to Google Drive';
  fileInput.value = '';
  
  // Populate boards select
  select.innerHTML = boards.map(b => `<option value="${b.id}">${b.name} ${b.is_public ? '(Public)' : '(Private)'}</option>`).join('');
  if (boards.length === 0) {
    select.innerHTML = `<option value="" disabled selected>No boards created. Create one first!</option>`;
  }

  modal.classList.add('show');

  const hideModal = () => {
    modal.classList.remove('show');
  };

  closeBtn.onclick = hideModal;
  cancelBtn.onclick = hideModal;

  if (newBoardBtn && onTriggerNewBoard) {
    newBoardBtn.onclick = () => {
      hideModal();
      onTriggerNewBoard();
    };
  }

  // Browse files
  browseBtn.onclick = () => fileInput.click();

  // Dropzone drag-drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  dropzone.ondragenter = (e) => {
    handleDrag(e);
    dropzone.classList.add('dragover');
  };

  dropzone.ondragover = handleDrag;

  dropzone.ondragleave = (e) => {
    handleDrag(e);
    dropzone.classList.remove('dragover');
  };

  // Add files to queue
  const addFilesToQueue = (filesList) => {
    for (const file of filesList) {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file.`);
        continue;
      }
      
      // Limit 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} exceeds the 10MB limit.`);
        continue;
      }

      const fileId = Math.random().toString(36).substr(2, 9);
      uploadQueue.push({ id: fileId, file, title: file.name.split('.')[0], progress: 0 });
    }

    renderQueue();
  };

  dropzone.ondrop = (e) => {
    handleDrag(e);
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  fileInput.onchange = () => {
    if (fileInput.files) {
      addFilesToQueue(fileInput.files);
    }
  };

  // Render Queue UI
  const renderQueue = () => {
    if (uploadQueue.length === 0) {
      queueContainer.innerHTML = '';
      queueContainer.style.display = 'none';
      submitBtn.disabled = true;
      return;
    }

    queueContainer.style.display = 'flex';
    submitBtn.disabled = false;

    queueContainer.innerHTML = uploadQueue.map(item => `
      <div style="display: flex; flex-direction: column; gap: 6px; padding: 10px; background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-color);" id="queue-item-${item.id}">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.85rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.file.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${(item.file.size / (1024 * 1024)).toFixed(2)} MB</div>
          </div>
          <button type="button" class="btn-remove-queue" data-id="${item.id}" style="color: #f87171; cursor: pointer;">
            <span class="material-icons-outlined" style="font-size: 1.1rem;">delete</span>
          </button>
        </div>
        
        <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; gap: 8px;">
            <input type="text" placeholder="Title (optional)" class="form-control" style="padding: 6px 10px; font-size: 0.8rem; border-radius: var(--radius-sm); background: var(--bg-tertiary); flex: 1;" value="${item.title}" id="title-input-${item.id}">
            <input type="text" placeholder="Description (optional)" class="form-control" style="padding: 6px 10px; font-size: 0.8rem; border-radius: var(--radius-sm); background: var(--bg-tertiary); flex: 1;" value="${item.description || ''}" id="desc-input-${item.id}">
          </div>
          <input type="url" placeholder="Destination link e.g. https://yourwebsite.com (optional)" class="form-control" style="padding: 6px 10px; font-size: 0.8rem; border-radius: var(--radius-sm); background: var(--bg-tertiary);" value="${item.linkUrl || ''}" id="link-input-${item.id}">
        </div>

        <div class="progress-bar-container" style="display: none; height: 4px;" id="progress-container-${item.id}">
          <div class="progress-bar" id="progress-bar-${item.id}"></div>
        </div>
        <div style="display: none; justify-content: space-between; font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;" id="progress-text-${item.id}">
          <span id="progress-status-${item.id}">Uploading...</span>
          <span id="progress-percent-${item.id}">0%</span>
        </div>
      </div>
    `).join('');

    // Remove buttons handler
    queueContainer.querySelectorAll('.btn-remove-queue').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        uploadQueue = uploadQueue.filter(item => item.id !== id);
        renderQueue();
      };
    });

    // Update title/desc/link bindings on change
    uploadQueue.forEach(item => {
      const titleInput = document.getElementById(`title-input-${item.id}`);
      const descInput = document.getElementById(`desc-input-${item.id}`);
      const linkInput = document.getElementById(`link-input-${item.id}`);
      
      if (titleInput) {
        titleInput.oninput = () => { item.title = titleInput.value; };
      }
      if (descInput) {
        descInput.oninput = () => { item.description = descInput.value; };
      }
      if (linkInput) {
        linkInput.oninput = () => { item.linkUrl = linkInput.value; };
      }
    });
  };

  // Submit Upload Form
  form.onsubmit = async (e) => {
    e.preventDefault();
    const boardId = select.value;
    if (!boardId) {
      alert("Please select a board or create one.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading queue...';

    // Disable file remove buttons
    queueContainer.querySelectorAll('.btn-remove-queue').forEach(btn => btn.style.display = 'none');
    browseBtn.disabled = true;
    dropzone.style.pointerEvents = 'none';

    // Upload items sequentially
    for (const item of uploadQueue) {
      const progContainer = document.getElementById(`progress-container-${item.id}`);
      const progBar = document.getElementById(`progress-bar-${item.id}`);
      const progText = document.getElementById(`progress-text-${item.id}`);
      const progPercent = document.getElementById(`progress-percent-${item.id}`);
      const progStatus = document.getElementById(`progress-status-${item.id}`);

      if (progContainer && progBar && progText) {
        progContainer.style.display = 'block';
        progText.style.display = 'flex';
      }

      try {
        await onUpload(boardId, item.file, item.title, item.description, item.linkUrl, (percent) => {
          if (progBar && progPercent) {
            progBar.style.width = `${percent}%`;
            progPercent.textContent = `${percent}%`;
          }
        });
        
        if (progStatus) {
          progStatus.textContent = 'Completed';
          progStatus.style.color = '#22c55e';
        }
      } catch (err) {
        console.error(err);
        if (progStatus) {
          progStatus.textContent = 'Failed';
          progStatus.style.color = '#ef4444';
        }
        alert(`Failed to upload ${item.file.name}: ${err.message}`);
      }
    }

    // Success, hide upload modal after 1.5s delay
    setTimeout(() => {
      hideModal();
    }, 1500);
  };
};
