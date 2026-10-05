# PulseChat Web

This directory is the browser version of PulseChat. The Android app remains unchanged.

## Local/demo mode
Open `web/index.html` through a local static server. Without Firebase configuration, the UI runs in demo mode.

## Firebase
Create a Firebase **Web App** in the same Firebase project used by PulseChat, copy `config.example.js` to `config.js`, and fill in the Web App config. Keep Firestore and Storage protected by the project's security rules.

## Deployment
The repository includes a GitHub Pages workflow. Once Pages is enabled for the repository, pushes to `main` deploy the `web/` directory.

For real Firebase authentication on the deployed site, add the Pages domain to Firebase Authentication's authorized domains.
