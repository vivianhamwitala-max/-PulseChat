# PulseChat Web

This is the browser client for PulseChat. The existing Android app remains untouched.

## Free hosting

The repository is prepared for **GitHub Pages**, which is available for public repositories on GitHub Free. The deployment workflow publishes the contents of `web/`. citehttps://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages

The intended URL is:

`https://vivianhamwitala-max.github.io/-PulseChat/`

GitHub Pages must be enabled once in the repository's **Settings → Pages** using **GitHub Actions** as the source.

## Real messaging

The web client uses the same Firestore structure defined by the repository rules:

- `users/{userId}`
- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`

Authentication uses Firebase Email/Password. The Firebase Spark plan is no-cost and includes no-cost quotas for Authentication and Cloud Firestore. citehttps://firebase.google.com/docs/projects/billing/firebase-pricing-planshttps://firebase.google.com/docs/firestore/pricing

### Connect the existing Firebase project

1. In Firebase Console, open the same project used by the Android PulseChat app.
2. Add a **Web App** to that project and copy its Firebase web configuration JSON.
3. In GitHub, open **Settings → Secrets and variables → Actions → New repository secret**.
4. Create the secret named `PULSECHAT_FIREBASE_CONFIG`.
5. Paste the web config JSON as the secret value, for example:
   `{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}`
6. In Firebase Authentication, enable **Email/Password** and add `vivianhamwitala-max.github.io` to the authorized domains.
7. Push/redispatch the Pages workflow.

The web configuration is injected during deployment, so the actual configuration is not committed to the repository. Firebase web configuration values are not treated as database credentials; the real protection comes from your Authentication and Firestore/Storage security rules.

## Current web features

Registration, sign-in, user search by email/display name, conversation creation, live Firestore message listeners, sending messages, chat list, and sign-out are implemented.