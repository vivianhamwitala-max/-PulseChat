# PulseChat Web

This is the browser client for PulseChat. The existing Android app remains untouched.

## Free hosting on Render

The repository includes a Render Blueprint in `render.yaml`. Render supports free static sites, and a static site is the correct hosting type for this browser client. citehttps://render.com/docs/free

1. Open Render and create a **New Blueprint Instance** from this GitHub repository.
2. Render detects `render.yaml` and creates the `pulsechat-web` static site.
3. During first setup, enter the value for `PULSECHAT_FIREBASE_CONFIG`.
4. After the deployment finishes, Render gives the site an `onrender.com` URL.

The build script writes the Firebase configuration into `web/config.js` only during the Render build, so the real configuration is not committed to GitHub. Render documents `sync: false` for values that should be entered securely during service creation. citehttps://render.com/docs/blueprint-spec

## Real messaging

The web client uses Firebase Authentication and Cloud Firestore with this structure:

- `users/{userId}`
- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`

The current web client supports account registration, sign-in, user search by email/display name, conversation creation, live Firestore message listeners, sending messages, chat list updates, and sign-out.

Before real users can chat, the Firebase project must have:

- a Firebase **Web App** registered;
- **Email/Password** authentication enabled;
- the web app's configuration supplied as `PULSECHAT_FIREBASE_CONFIG`;
- the deployed Render domain added to Firebase Authentication's authorized domains.

The Android app's Firebase configuration is not present in this GitHub repository, so the web Firebase configuration cannot be safely reconstructed from the repository alone.

## GitHub Pages

The repository also retains the GitHub Pages workflow. GitHub Pages can publish from GitHub Actions, but the repository must have Pages enabled in **Settings → Pages → Build and deployment → Source → GitHub Actions**. citehttps://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

