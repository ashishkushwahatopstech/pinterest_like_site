// Google Drive API Integration Helpers (V3 REST API)
// All operations are executed using the short-lived access token retrieved from our Worker.

// Retrieve or create the root app folder "PinGridGallery"
export const getRootFolder = async (accessToken) => {
  const q = "(name = 'PinGridGallery' or name = 'PinterestStyleGallery') and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!res.ok) {
    throw new Error("Failed to query Google Drive root folder.");
  }
  
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  
  // Folder doesn't exist, create it
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: "PinGridGallery",
      mimeType: "application/vnd.google-apps.folder"
    })
  });
  
  if (!createRes.ok) {
    throw new Error("Failed to create Google Drive root folder.");
  }
  
  const folder = await createRes.json();
  return folder.id;
};

// Retrieve or create a subfolder (board) inside our root folder
export const getOrCreateBoardFolder = async (accessToken, rootFolderId, boardName) => {
  const sanitizedBoardName = boardName.replace(/'/g, "\\'");
  const q = `name = '${sanitizedBoardName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to query Google Drive folder for board: ${boardName}`);
  }
  
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  
  // Create the subfolder
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: boardName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId]
    })
  });
  
  if (!createRes.ok) {
    throw new Error(`Failed to create Google Drive folder for board: ${boardName}`);
  }
  
  const folder = await createRes.json();
  return folder.id;
};

// Rename a board folder on Google Drive
export const renameBoardFolder = async (accessToken, folderId, newName) => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: newName
    })
  });
  
  if (!res.ok) {
    throw new Error("Failed to rename board folder in Google Drive.");
  }
  return true;
};

// Delete a file/folder from Google Drive
export const deleteFromDrive = async (accessToken, fileId) => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (res.status === 404) return true; // Already deleted
  if (!res.ok) {
    throw new Error("Failed to delete file from Google Drive.");
  }
  return true;
};

// Grant public read permission to a file so it can be loaded via a direct URL
export const makeFilePublic = async (accessToken, fileId) => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      role: "reader",
      type: "anyone"
    })
  });
  
  if (!res.ok) {
    throw new Error("Failed to make file public on Google Drive.");
  }
  return true;
};

// Upload file using XMLHttpRequest to enable granular progress updates
export const uploadFileToDrive = async (accessToken, folderId, file, title, description, progressCallback) => {
  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [folderId],
    description: description || ""
  };
  
  const boundary = "antigravity_gallery_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  
  // Read file data
  const fileData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
  
  // Build multipart body parts
  const metadataPart = delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata);
    
  const mediaHeader = delimiter +
    `Content-Type: ${file.type}\r\n` +
    "Content-Transfer-Encoding: binary\r\n\r\n";
    
  const blob = new Blob([
    metadataPart,
    mediaHeader,
    new Uint8Array(fileData),
    closeDelimiter
  ], { type: `multipart/related; boundary=${boundary}` });
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webContentLink,webViewLink");
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    
    if (xhr.upload && progressCallback) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          progressCallback(percent);
        }
      });
    }
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (err) {
          reject(new Error("Invalid JSON response from Google Drive."));
        }
      } else {
        reject(new Error(`Google Drive upload failed: ${xhr.statusText} (${xhr.responseText})`));
      }
    };
    
    xhr.onerror = () => reject(new Error("Network error during Google Drive upload."));
    xhr.send(blob);
  });
};

// Calculate storage usage of the app
// Because our Google OAuth scope is restricted to drive.file,
// listing files will automatically return ONLY files created by this app!
export const getAppStorageUsage = async (accessToken) => {
  let nextPageToken = null;
  let totalBytes = 0;
  
  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    url.searchParams.set("q", "trashed = false");
    url.searchParams.set("fields", "nextPageToken, files(size)");
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken);
    
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!res.ok) {
      throw new Error("Failed to query file sizes for storage usage.");
    }
    
    const data = await res.json();
    if (data.files) {
      for (const file of data.files) {
        totalBytes += parseInt(file.size || 0);
      }
    }
    nextPageToken = data.nextPageToken;
  } while (nextPageToken);
  
  return totalBytes;
};
